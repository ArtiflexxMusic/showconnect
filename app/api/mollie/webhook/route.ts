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
  createSubscription,
  toMollieDate,
} from '@/lib/mollie'
import type { Plan, PlanInterval } from '@/lib/plans'
import {
  sendEmail,
  buildPaymentConfirmedEmail,
  buildPaymentRenewedEmail,
} from '@/lib/email'

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
      // ── Eerste betaling geslaagd – plan activeren + recurring subscription opzetten ──
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

      // ── Mollie subscription aanmaken voor automatische verlenging ──
      // Alleen bij 'first' betalingen — 'oneoff' is legacy en heeft geen mandaat.
      if (payment.sequenceType === 'first' && payment.customerId) {
        try {
          const variant = PLAN_VARIANTS[variantKey]
          const sub = await createSubscription({
            customerId: payment.customerId,
            variant,
            webhookUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cueboard.nl'}/api/mollie/webhook`,
            // Eerste auto-incasso start exact wanneer huidige periode afloopt — geen dubbele charge
            startDate:  toMollieDate(expiresAt),
            userId,
          })
          await supabase
            .from('profiles')
            .update({ mollie_subscription_id: sub.id })
            .eq('id', userId)
        } catch (subErr) {
          // Subscription creëren mislukt: plan blijft actief tot expiresAt, maar geen auto-renew.
          // Gebruiker krijgt later via cron/UI een herinnering om handmatig te verlengen.
          console.error(`[mollie/webhook] Subscription aanmaken mislukt voor ${userId}:`, subErr)
        }
      }

      // Bevestigingsmail (faalt zacht — Mollie hoeft niet te retry-en op mailfout)
      await sendPaymentEmail({
        supabase, userId, paymentId, plan, interval,
        amount: payment.amount, expiresAt: expiresAt.toISOString(), kind: 'confirmed',
      })

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

      await sendPaymentEmail({
        supabase, userId, paymentId, plan, interval,
        amount: payment.amount, expiresAt: expiresAt.toISOString(), kind: 'renewed',
      })

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

// ── Helper: bevestigings/verleng-mail versturen ─────────────────────────────
async function sendPaymentEmail(args: {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  paymentId: string
  plan: Plan
  interval: PlanInterval
  amount: { value: string; currency: string }
  expiresAt: string
  kind: 'confirmed' | 'renewed'
}) {
  try {
    const { data: profile } = await args.supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', args.userId)
      .single()

    if (!profile?.email) {
      console.warn(`[mollie/webhook] Geen email gevonden voor user ${args.userId}, mail overgeslagen`)
      return
    }

    const builder = args.kind === 'confirmed' ? buildPaymentConfirmedEmail : buildPaymentRenewedEmail
    const { subject, html } = builder({
      name: profile.full_name ?? null,
      plan: args.plan as 'pro' | 'team',
      interval: args.interval as 'monthly' | 'yearly',
      amount: args.amount.value,
      currency: args.amount.currency,
      expiresAt: args.expiresAt,
      paymentId: args.paymentId,
    })

    const result = await sendEmail({ to: profile.email, subject, html })
    if (!result.ok) {
      console.warn(`[mollie/webhook] ${args.kind}-mail naar ${profile.email} mislukt:`, result.error)
    }
  } catch (err) {
    console.error(`[mollie/webhook] Mail-fout (${args.kind}):`, err)
    // Nooit gooien — mail-fout mag de betalingsverwerking niet breken
  }
}
