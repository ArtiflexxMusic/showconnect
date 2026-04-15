import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'

/**
 * Handelt e-mailbevestigingen af via token_hash flow.
 *
 * Deze route is een vervanger voor het legacy /auth/callback flow (PKCE met code_verifier).
 * Reden: PKCE heeft een code_verifier cookie nodig die op het registratie-device staat.
 * Als de gebruiker de bevestigingsmail op een ander device opent, faalt PKCE.
 *
 * Token_hash flow heeft géén code_verifier nodig en werkt cross-device.
 *
 * Verwacht URL: /auth/confirm?token_hash=...&type=signup&next=/email-confirmed
 * Types: signup | recovery | invite | magiclink | email_change | email
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type') as EmailOtpType | null
  const next       = searchParams.get('next') ?? '/dashboard'

  if (!token_hash || !type) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ type, token_hash })

  if (error) {
    console.error('[auth/confirm] verifyOtp mislukt:', error.message)
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
