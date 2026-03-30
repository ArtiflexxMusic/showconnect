/**
 * POST /api/admin/user-action
 *
 * Voert beheerdersacties uit op een gebruiker:
 *   - resend_confirmation   → bevestigingsmail opnieuw sturen
 *   - confirm_email         → email handmatig bevestigen (geen mail nodig)
 *   - send_password_reset   → wachtwoord-reset mail sturen
 *   - send_magic_link       → inloglink sturen (passwordless)
 *   - change_email          → emailadres wijzigen
 *   - change_name           → naam wijzigen
 *   - change_role           → rol wijzigen
 *   - change_phone          → telefoonnummer wijzigen
 *
 * Vereist: beheerder- of admin-rol.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from '@/lib/env'
import { isPlatformAdmin } from '@/lib/plans'

export async function POST(request: NextRequest) {
  // Verifieer dat de aanvrager beheerder is
  const supabase = await createServerClient()
  const { data: { user: me } } = await supabase.auth.getUser()
  if (!me) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', me.id)
    .single()

  if (!isPlatformAdmin(myProfile?.role)) {
    return NextResponse.json({ error: 'Geen beheerderrechten' }, { status: 403 })
  }

  const body = await request.json() as {
    action: string
    userId: string
    email?: string
    newEmail?: string
    newName?: string
    newRole?: string
    newPhone?: string
  }

  const { action, userId } = body
  if (!action || !userId) {
    return NextResponse.json({ error: 'action en userId zijn verplicht' }, { status: 400 })
  }

  // Admin client met service role voor Supabase Auth Admin API
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Haal het huidige emailadres op
  const { data: { user: target }, error: fetchErr } = await admin.auth.admin.getUserById(userId)
  if (fetchErr || !target) {
    return NextResponse.json({ error: 'Gebruiker niet gevonden' }, { status: 404 })
  }

  const targetEmail = target.email ?? ''

  switch (action) {

    case 'resend_confirmation': {
      // auth.resend() stuurt de email daadwerkelijk via de geconfigureerde SMTP
      // (generateLink() doet dat NIET — die geeft alleen de link terug)
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: targetEmail,
        options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cueboard-app.vercel.app'}/auth/callback` },
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, message: `Bevestigingsmail verstuurd naar ${targetEmail}` })
    }

    case 'confirm_email': {
      // Bevestig het email adres zonder mail te sturen
      const { error } = await admin.auth.admin.updateUserById(userId, {
        email_confirm: true,
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, message: 'E-mailadres handmatig bevestigd' })
    }

    case 'send_password_reset': {
      // resetPasswordForEmail stuurt via SMTP (generateLink doet dat niet)
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cueboard-app.vercel.app'}/auth/callback?next=/reset-password`,
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, message: `Wachtwoord-resetmail verstuurd naar ${targetEmail}` })
    }

    case 'send_magic_link': {
      // signInWithOtp stuurt de magic link via SMTP (generateLink doet dat niet)
      const { error } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cueboard-app.vercel.app'}/auth/callback` },
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, message: `Inloglink verstuurd naar ${targetEmail}` })
    }

    case 'change_email': {
      const newEmail = body.newEmail?.trim()
      if (!newEmail || !newEmail.includes('@')) {
        return NextResponse.json({ error: 'Ongeldig e-mailadres' }, { status: 400 })
      }
      // Bijwerken in auth én profiles
      const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
        email: newEmail,
        email_confirm: true,
      })
      if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 })

      await admin.from('profiles').update({ email: newEmail }).eq('id', userId)
      return NextResponse.json({ success: true, message: `E-mailadres gewijzigd naar ${newEmail}` })
    }

    case 'change_name': {
      const newName = body.newName?.trim()
      if (!newName) return NextResponse.json({ error: 'Naam is leeg' }, { status: 400 })
      const { error } = await admin.from('profiles').update({ full_name: newName }).eq('id', userId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, message: `Naam gewijzigd naar ${newName}` })
    }

    case 'change_role': {
      const newRole = body.newRole
      const validRoles = ['crew', 'admin', 'beheerder']
      if (!newRole || !validRoles.includes(newRole)) {
        return NextResponse.json({ error: 'Ongeldige rol' }, { status: 400 })
      }
      const { error } = await admin.from('profiles').update({ role: newRole }).eq('id', userId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, message: `Rol gewijzigd naar ${newRole}` })
    }

    case 'change_phone': {
      const newPhone = body.newPhone?.trim() ?? null
      const { error } = await admin.from('profiles').update({ phone: newPhone }).eq('id', userId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, message: 'Telefoonnummer bijgewerkt' })
    }

    default:
      return NextResponse.json({ error: `Onbekende actie: ${action}` }, { status: 400 })
  }
}
