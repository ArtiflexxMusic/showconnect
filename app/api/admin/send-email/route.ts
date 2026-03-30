/**
 * POST /api/admin/send-email
 *
 * Stuurt een directe e-mail naar een specifieke gebruiker.
 * Alleen toegankelijk voor admins en beheerders.
 *
 * Body: { userId: string; subject: string; message: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, buildAdminDirectEmail } from '@/lib/email'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  // Alleen admins en beheerders
  const { data: adminProfile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!adminProfile || !['beheerder', 'admin'].includes(adminProfile.role)) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const { userId, subject, message } = body ?? {}

  if (!userId || !subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'userId, subject en message zijn verplicht' }, { status: 400 })
  }

  // Haal ontvanger op
  const { data: recipient } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('id', userId)
    .single()

  if (!recipient?.email) {
    return NextResponse.json({ error: 'Gebruiker niet gevonden' }, { status: 404 })
  }

  const mail = buildAdminDirectEmail({
    name:    recipient.full_name,
    subject: subject.trim(),
    message: message.trim(),
  })

  const result = await sendEmail({ to: recipient.email, ...mail })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, to: recipient.email })
}
