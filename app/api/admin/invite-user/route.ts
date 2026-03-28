/**
 * POST /api/admin/invite-user
 *
 * Nodigt een nieuwe gebruiker uit via een Supabase magic-link mail.
 * Alleen toegankelijk voor beheerders en admins.
 * Body: { email, fullName?, plan?, planSource? }
 *
 * Supabase stuurt automatisch een uitnodigings-e-mail met een acceptatie-link.
 * Na acceptatie wordt het profiel aangemaakt via de handle_new_user trigger,
 * inclusief een 3-daagse trial.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import type { Plan, PlanSource } from '@/lib/plans'
import { sendEmail, buildInviteEmail } from '@/lib/email'

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  // Verifieer dat de aanroeper een beheerder of admin is
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!['beheerder', 'admin'].includes(profile?.role ?? '')) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }

  const body = await request.json()
  const {
    email,
    fullName,
    plan,
    planSource,
  } = body as {
    email: string
    fullName?: string
    plan?: Plan
    planSource?: PlanSource
  }

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Ongeldig e-mailadres' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Stuur uitnodiging via Supabase Auth (magic link mail)
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email,
    {
      data: { full_name: fullName ?? '' },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    }
  )

  if (inviteError) {
    // Geef een duidelijkere foutmelding als gebruiker al bestaat
    if (inviteError.message?.toLowerCase().includes('already')) {
      return NextResponse.json({ error: 'Dit e-mailadres is al geregistreerd.' }, { status: 409 })
    }
    return NextResponse.json({ error: inviteError.message }, { status: 500 })
  }

  // Optioneel: stel direct een plan in (bijv. Pro cadeau)
  if (plan && plan !== 'free' && inviteData?.user?.id) {
    const resolvedSource: PlanSource = planSource ?? 'gift'
    await admin
      .from('profiles')
      .update({ plan, plan_source: resolvedSource })
      .eq('id', inviteData.user.id)
  }

  return NextResponse.json({ success: true, userId: inviteData?.user?.id })
}
