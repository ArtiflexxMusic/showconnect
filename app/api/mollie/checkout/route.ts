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
    const variantKey = body?.variant as string | undefined

    if (!variantKey || !PLAN_VARIANTS[variantKey]) {
      return NextResponse.json({ error: 'Ongeldig plan' }, { status: 400 })
    }

    const variant = PLAN_VARIANTS[variantKey]

    // Haal huidig profiel op
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email, mollie_customer_id')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profiel niet gevonden' }, { status: 404 })

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

    // Maak eerste betaling aan
    const payment = await createFirstPayment({
      customerId,
      variant,
      redirectUrl: `${baseUrl}/dashboard?payment=success&plan=${variant.plan}&interval=${variant.interval}`,
      webhookUrl:  `${baseUrl}/api/mollie/webhook`,
      userId:      user.id,
    })

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
