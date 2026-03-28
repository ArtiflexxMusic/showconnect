/**
 * PATCH /api/admin/update-plan
 *
 * Wijzigt het plan van een gebruiker. Alleen toegankelijk voor beheerders.
 * Body: { userId, plan, planSource, planExpiresAt? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import type { Plan, PlanSource } from '@/lib/plans'

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function PATCH(request: NextRequest) {
  // Verifieer beheerder
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'beheerder') {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }

  const body = await request.json()
  const { userId, plan, planSource, planExpiresAt } = body as {
    userId: string
    plan: Plan
    planSource: PlanSource
    planExpiresAt: string | null
  }

  if (!userId || !plan || !planSource) {
    return NextResponse.json({ error: 'Ongeldige invoer' }, { status: 400 })
  }

  const validPlans: Plan[] = ['free', 'pro', 'team']
  const validSources: PlanSource[] = ['free', 'gift', 'paid']

  if (!validPlans.includes(plan) || !validSources.includes(planSource)) {
    return NextResponse.json({ error: 'Ongeldig plan of bron' }, { status: 400 })
  }

  // plan_source moet 'free' zijn als plan 'free' is
  const resolvedSource: PlanSource = plan === 'free' ? 'free' : planSource

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({
      plan,
      plan_source: resolvedSource,
      plan_expires_at: planExpiresAt ?? null,
    })
    .eq('id', userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
