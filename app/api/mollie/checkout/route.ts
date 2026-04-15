/**
 * POST /api/mollie/checkout
 *
 * Maakt een Mollie betaalsessie aan voor een nieuw (of gewijzigd) abonnement.
 * Geeft een { url } terug waar de gebruiker naartoe gestuurd moet worden.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  createCustomer,
  createFirstPayment,
  isRecurringMethod,
  PLAN_VARIANTS,
} from '@/lib/mollie'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

    const body = await request.json().catch(() => null)
    const variantKey  = body?.variant as string | undefined
    const method      = body?.method  as string | undefined   // optioneel: 'ideal', 'bancontact', etc.
    const billingType = (body?.billingType as 'subscription' | 'oneoff' | undefined) ?? 'subscription'

    if (!variantKey || !PLAN_VARIANTS[variantKey]) {
      return NextResponse.json({ error: 'Ongeldig plan' }, { status: 400 })
    }

    const variant = PLAN_VARIANTS[variantKey]

    // Haal huidig profiel op
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, mollie_customer_id, mollie_subscription_id')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profiel niet gevonden' }, { status: 404 })

    // Voorkom dubbele incasso: weiger als er al een actief abonnement is
    if (profile.mollie_subscription_id) {
      return NextResponse.json(
        { error: 'Je hebt al een actief abonnement. Zeg dat eerst op via /upgrade voordat je een nieuw plan kiest.' },
        { status: 400 }
      )
    }

    // Maak Mollie klant aan (eenmalig per gebruiker)
    let customerId = profile.mollie_customer_id
    if (!customerId) {
      const customer = await createCustomer(
        profile.full_name ?? profile.email,
        profile.email
      )
      customerId = customer.id
      await supabase
        .from('profiles')
        .update({ mollie_customer_id: customerId })
        .eq('id', user.id)
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `https://${request.headers.get('host')}`

    // De gebruiker kiest expliciet in checkout: subscription = first (mandate + auto-incasso),
    // oneoff = eenmalige betaling. De methode-keuze is daar al op gefilterd in de UI.
    // Extra safety: als de methode geen recurring kan, dwingen we oneoff (mocht UI gefaald zijn).
    const preferredSequence: 'first' | 'oneoff' =
      billingType === 'subscription' && isRecurringMethod(method) ? 'first' : 'oneoff'

    const paymentArgs = {
      customerId,
      variant,
      redirectUrl: `${baseUrl}/dashboard?payment=success&plan=${variant.plan}&interval=${variant.interval}`,
      webhookUrl:  `${baseUrl}/api/mollie/webhook`,
      userId:      user.id,
      method,
    }

    // Probeer eerst recurring; als Mollie/methode dit niet ondersteunt
    // (bv. iDEAL Wero, of account zonder SEPA Direct Debit), val terug op oneoff
    // zodat de gebruiker alsnog kan betalen (zonder auto-verlenging).
    let payment
    try {
      payment = await createFirstPayment({ ...paymentArgs, sequenceType: preferredSequence })
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      const isRecurringRejection =
        preferredSequence === 'first' &&
        /recurring|sequenceType|mandate/i.test(msg)
      if (isRecurringRejection) {
        console.warn(`[mollie/checkout] '${method}' weigerde recurring (${msg}), retry als oneoff`)
        payment = await createFirstPayment({ ...paymentArgs, sequenceType: 'oneoff' })
      } else {
        throw err
      }
    }

    const checkoutUrl = payment._links.checkout?.href
    if (!checkoutUrl) {
      return NextResponse.json({ error: 'Geen checkout URL ontvangen van Mollie' }, { status: 500 })
    }

    return NextResponse.json({ url: checkoutUrl })
  } catch (err: unknown) {
    console.error('[mollie/checkout]', err)
    const message = err instanceof Error ? err.message : 'Checkout mislukt'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
