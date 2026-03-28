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
import { sendEmail, buildPaymentRequestEmail } from '@/lib/email'

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
