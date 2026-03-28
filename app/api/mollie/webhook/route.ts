/**
 * POST /api/mollie/webhook
 *
 * Verwerkt Mollie betalingsnotificaties.
 *
 * Stroom:
 *  1. Eerste betaling (sequenceType: "first") → betaald:
 *     - Plan + plan_expires_at instellen in Supabase
 *     - Abonnement aanmaken in Mollie (startDate = einde huidige periode)
 *     - mollie_subscription_id opslaan
 *
 *  2. Terugkerende betaling (sequenceType: "recurring") → betaald:
 *     - plan_expires_at verlengen
 *
 *  3. Betaling mislukt / geannuleerd:
 *     - Eventueel plan terugzetten (nog niet geactiveerd = geen actie)
 *
 * Mollie stuurt GEEN JSON body; de payment-ID zit als form-field "id".
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getPayment,
  createSubscription,
  nextExpiryDate,
  toMollieDate,
  PLAN_VARIANTS,
} from '@/lib/mollie'
import type { Plan, PlanInterval } from '@/lib/plans'

export async function POST(request: NextRequest) {
  try {
    // Mollie stuurt form-encoded data: id=tr_xxxx
    const formData = await request.formData().catch(() => null)
    const paymentId = formData?.get('id') as string | null

    if (!paymentId) {
      return NextResponse.json({ error: 'Geen payment ID' }, { status: 400 })
    }

    const payment = await getPayment(paymentId)
    const meta = payment.metadata ?? {}
    const userId   = meta.userId
    const plan     = meta.plan     as Plan         | undefined
    const interval = meta.interval as PlanInterval | undefined

    if (!userId || !plan || !interval) {
      // Niet onze betaling (bijv. Mollie test ping) – gewoon 200 teruggeven
      return NextResponse.json({ ok: true })
    }

    const variantKey = `${plan}_${interval}`
    const variant = PLAN_VARIANTS[variantKey]
    if (!variant) return NextResponse.json({ ok: true })

    const supabase = await createClient()

    if (payment.status === 'paid' && payment.sequenceType === 'first') {
      // ── Eerste betaling geslaagd ─────────────────────────────────────────
      const expiresAt = nextExpiryDate(interval)

      // Plan activeren
      await supabase
        .from('profiles')
        .update({
          plan:            plan,
          plan_source:     'paid',
          plan_interval:   interval,
          plan_expires_at: expiresAt.toISOString(),
        })
        .eq('id', userId)

      // Abonnement aanmaken bij Mollie
      // startDate = dag waarop de VOLGENDE periode begint
      const customerId = payment.customerId
      if (customerId) {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://cueboard.nl'
          const subscription = await createSubscription({
            customerId,
            variant,
            webhookUrl: `${baseUrl}/api/mollie/webhook`,
            startDate:  toMollieDate(expiresAt),
            userId,
          })

          await supabase
            .from('profiles')
            .update({ mollie_subscription_id: subscription.id })
            .eq('id', userId)
        } catch (subErr) {
          // Abonnement aanmaken mislukt – plan is al actief, log de fout
          console.error('[mollie/webhook] Subscription aanmaken mislukt:', subErr)
        }
      }

    } else if (payment.status === 'paid' && payment.sequenceType === 'recurring') {
      // ── Terugkerende betaling geslaagd – periode verlengen ───────────────
      const expiresAt = nextExpiryDate(interval)
      await supabase
        .from('profiles')
        .update({ plan_expires_at: expiresAt.toISOString() })
        .eq('id', userId)

    } else if (['failed', 'canceled', 'expired'].includes(payment.status)) {
      // ── Betaling mislukt – alleen loggen (plan al actief? Niet aanraken) ─
      console.warn(`[mollie/webhook] Betaling ${paymentId} status: ${payment.status} voor gebruiker ${userId}`)
    }

    // Mollie verwacht altijd 200 OK
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    console.error('[mollie/webhook] Fout:', err)
    // Nog steeds 200 teruggeven zodat Mollie niet blijft herhalen
    return NextResponse.json({ ok: true })
  }
}
