/**
 * POST /api/admin/test-email
 *
 * Stuurt een test-e-mail naar het opgegeven adres.
 * Alleen toegankelijk voor beheerders.
 *
 * Body: { to: string }
 *
 * Gebruik in de browser console:
 *   fetch('/api/admin/test-email', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({to:'jouw@email.nl'}) }).then(r=>r.json()).then(console.log)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  // Alleen beheerders
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['beheerder', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const to   = typeof body?.to === 'string' ? body.to.trim() : user.email

  const hasMailjet = !!(process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY)
  const hasResend  = !!process.env.RESEND_API_KEY

  if (!hasMailjet && !hasResend) {
    return NextResponse.json({
      ok:      false,
      error:   'Geen e-mailprovider geconfigureerd.',
      provider: null,
      setup: {
        mailjet: [
          '1. Maak een gratis account aan op https://app.mailjet.com',
          '2. Ga naar Account → API Keys en kopieer de API Key en Secret Key',
          '3. Ga naar Account → Sender domains & addresses → voeg info@artiflexx.nl toe (je ontvangt een verificatie-link)',
          '4. Voeg toe in Vercel Dashboard → Settings → Environment Variables:',
          '   MAILJET_API_KEY = jouw-api-key',
          '   MAILJET_SECRET_KEY = jouw-secret-key',
          '   MAILJET_FROM_EMAIL = info@artiflexx.nl (optioneel, dit is de standaard)',
          '5. Trigger een nieuwe deployment (Vercel → Deployments → Redeploy)',
        ],
      },
    }, { status: 500 })
  }

  const result = await sendEmail({
    to: to!,
    subject: '✅ CueBoard e-mail test',
    html: `
      <div style="font-family:sans-serif;padding:32px;background:#0a0a0a;color:#fff;border-radius:8px;">
        <h2 style="margin:0 0 16px;">E-mail werkt! 🎉</h2>
        <p style="color:#aaa;">Dit is een test-e-mail van CueBoard. Als je dit ontvangt, is de Resend-integratie correct geconfigureerd.</p>
        <p style="color:#555;font-size:12px;margin-top:24px;">Verstuurd naar: ${to}</p>
      </div>
    `,
  })

  const provider = hasMailjet ? 'mailjet' : 'resend'

  if (!result.ok) {
    return NextResponse.json({
      ok:       false,
      provider,
      error:    result.error,
      hint:     provider === 'mailjet'
        ? 'Controleer of MAILJET_API_KEY en MAILJET_SECRET_KEY correct zijn, en of het afzenderadres geverifieerd is in Mailjet (Account → Sender domains).'
        : 'Controleer RESEND_API_KEY en of het domein geverifieerd is op https://resend.com/domains',
    }, { status: 500 })
  }

  return NextResponse.json({ ok: true, to, provider })
}
