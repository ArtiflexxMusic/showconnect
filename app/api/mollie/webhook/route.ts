/**
 * POST /api/mollie/webhook
 *
 * Verwerkt Mollie betalingsnotificaties.
 *
 * Stroom:
 *  1. Eenmalige betaling (sequenceType: "oneoff") → betaald:
 *     - Plan + plan_expires_at instellen in Supabase
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
  nextExpiryDate,
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
    if (!PLAN_VARIANTS[variantKey]) return NextResponse.json({ ok: true })

    const supabase = await createClient()

    if (payment.status === 'paid' && (payment.sequenceType === 'oneoff' || payment.sequenceType === 'first')) {
      // ── Betaling geslaagd – plan activeren ──────────────────────────────
      const expiresAt = nextExpiryDate(interval)

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          plan:            plan,
          plan_source:     'paid',
          plan_interval:   interval,
          plan_expires_at: expiresAt.toISOString(),
        })
        .eq('id', userId)

      if (updateErr) {
        console.error(`[mollie/webhook] Plan activeren mislukt voor ${userId} (${paymentId}):`, updateErr.message)
        // Gooi een fout zodat Mollie later opnieuw probeert
        throw new Error(`DB update mislukt: ${updateErr.message}`)
      }

    } else if (payment.status === 'paid' && payment.sequenceType === 'recurring') {
      // ── Terugkerende betaling geslaagd – periode verlengen ───────────────
      const expiresAt = nextExpiryDate(interval)
      const { error: renewErr } = await supabase
        .from('profiles')
        .update({ plan_expires_at: expiresAt.toISOString() })
        .eq('id', userId)

      if (renewErr) {
        console.error(`[mollie/webhook] Verlengen mislukt voor ${userId} (${paymentId}):`, renewErr.message)
        throw new Error(`DB update mislukt: ${renewErr.message}`)
      }

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
