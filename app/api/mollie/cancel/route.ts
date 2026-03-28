/**
 * POST /api/mollie/cancel
 *
 * Beëindigt het actieve plan van de ingelogde gebruiker.
 *
 * - Als er een Mollie-abonnement actief is: opzeggen bij Mollie + plan actief tot plan_expires_at
 * - Als er géén abonnement is (oneoff betaling): plan direct terugzetten naar free
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

    if (!profile) return NextResponse.json({ error: 'Profiel niet gevonden' }, { status: 404 })

    if (profile.mollie_subscription_id && profile.mollie_customer_id) {
      // ── Mollie-abonnement opzeggen ──────────────────────────────────────
      // Plan blijft actief tot einde betaalperiode
      await cancelSubscription(profile.mollie_customer_id, profile.mollie_subscription_id)

      await supabase
        .from('profiles')
        .update({ mollie_subscription_id: null })
        .eq('id', user.id)

      return NextResponse.json({
        ok:      true,
        mode:    'subscription_cancelled',
        expires_at: profile.plan_expires_at,
      })
    } else {
      // ── Eenmalige betaling: plan direct terugzetten naar free ───────────
      await supabase
        .from('profiles')
        .update({
          plan:                  'free',
          plan_source:           'free',
          plan_interval:         null,
          plan_expires_at:       null,
          mollie_subscription_id: null,
        })
        .eq('id', user.id)

      return NextResponse.json({
        ok:   true,
        mode: 'downgraded_to_free',
      })
    }
  } catch (err: unknown) {
    console.error('[mollie/cancel]', err)
    const message = err instanceof Error ? err.message : 'Annulering mislukt'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
