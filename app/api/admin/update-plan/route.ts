/**
 * PATCH /api/admin/update-plan
 *
 * Wijzigt het plan van een gebruiker. Alleen toegankelijk voor beheerders.
 * Body: { userId, plan, planSource, planExpiresAt? }
 *
 * Stuurt automatisch een mail als plan_source op 'paid' wordt gezet.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import type { Plan, PlanSource } from '@/lib/plans'
import { isPlatformAdmin } from '@/lib/plans'
import { sendEmail, buildPaymentRequestEmail } from '@/lib/email'
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from '@/lib/env'

function createAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
}

export async function PATCH(request: NextRequest) {
  // Verifieer beheerder
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role, admin_permissions').eq('id', user.id).single()
  if (!isPlatformAdmin(profile?.role)) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }
  // Admins need the 'change_plan' permission
  if (profile?.role === 'admin') {
    const perms = (profile.admin_permissions as string[] | null) ?? []
    if (!perms.includes('change_plan')) {
      return NextResponse.json({ error: 'Geen rechten voor plan-wijziging' }, { status: 403 })
    }
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

  const resolvedSource: PlanSource = plan === 'free' ? 'free' : planSource

  // Haal het huidige plan op (voor vergelijking)
  const admin = createAdminClient()
  const { data: targetProfile } = await admin
    .from('profiles')
    .select('email, full_name, plan, plan_source')
    .eq('id', userId)
    .single()

  // Plan opslaan
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

  // ── Mail versturen als plan_source op 'paid' wordt gezet ──────────────────
  const isPaidActivation =
    resolvedSource === 'paid' &&
    targetProfile?.plan_source !== 'paid' &&
    (plan === 'pro' || plan === 'team')

  if (isPaidActivation && targetProfile?.email) {
    const emailData = buildPaymentRequestEmail({
      name:    targetProfile.full_name,
      plan:    plan as 'pro' | 'team',
    })

    await sendEmail({
      to:      targetProfile.email,
      subject: emailData.subject,
      html:    emailData.html,
    })
  }

  return NextResponse.json({ success: true, emailSent: isPaidActivation })
}
