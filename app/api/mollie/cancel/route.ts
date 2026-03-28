/**
 * POST /api/mollie/cancel
 *
 * Beëindigt het actieve Mollie-abonnement van de ingelogde gebruiker.
 * Het plan blijft actief tot het einde van de huidige betaalperiode (plan_expires_at).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cancelSubscription } from '@/lib/mollie'

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

    const { data: profile } = await supabase
      .from('profiles')
      .select('mollie_customer_id, mollie_subscription_id, plan_expires_at')
      .eq('id', user.id)
      .single()

    if (!profile?.mollie_customer_id || !profile?.mollie_subscription_id) {
      return NextResponse.json({ error: 'Geen actief abonnement gevonden' }, { status: 400 })
    }

    // Opzeg abonnement bij Mollie
    await cancelSubscription(profile.mollie_customer_id, profile.mollie_subscription_id)

    // Verwijder subscription ID – plan blijft actief tot plan_expires_at
    await supabase
      .from('profiles')
      .update({ mollie_subscription_id: null })
      .eq('id', user.id)

    return NextResponse.json({
      ok: true,
      expires_at: profile.plan_expires_at,
    })
  } catch (err: unknown) {
    console.error('[mollie/cancel]', err)
    const message = err instanceof Error ? err.message : 'Annulering mislukt'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
