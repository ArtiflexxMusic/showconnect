import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ROLE_LABELS: Record<string, string> = {
  owner:     'Eigenaar',
  editor:    'Editor',
  caller:    'Caller',
  crew:      'Crew',
  presenter: 'Presenter',
  viewer:    'Toeschouwer',
}

const ROLE_DESC: Record<string, string> = {
  owner:     'Je hebt volledige controle over de show.',
  editor:    'Je kunt rundowns bewerken en aanpassen.',
  caller:    'Je hebt toegang tot de caller-view en kunt cue-statussen wijzigen.',
  crew:      'Je hebt toegang tot de crew-view met technische notities.',
  presenter: 'Je kunt je eigen cues en de volgorde van de show zien.',
  viewer:    'Je kunt de show meekijken.',
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
    }

    const body = await req.json()
    const { invitationId } = body

    if (!invitationId) {
      return NextResponse.json({ error: 'invitationId vereist' }, { status: 400 })
    }

    // Haal de uitnodiging op met show-informatie
    const { data: invitation, error: invError } = await supabase
      .from('invitations')
      .select('*, shows(name, date)')
      .eq('id', invitationId)
      .single()

    if (invError || !invitation) {
      return NextResponse.json({ error: 'Uitnodiging niet gevonden' }, { status: 404 })
    }

    // Controleer dat de huidige gebruiker eigenaar of editor is van de show
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const isPlatformAdmin = profile?.role === 'beheerder' || profile?.role === 'admin'

    if (!isPlatformAdmin) {
      const { data: membership } = await supabase
        .from('show_members')
        .select('role')
        .eq('show_id', invitation.show_id)
        .eq('user_id', user.id)
        .single()

      if (!membership || !['owner', 'editor'].includes(membership.role)) {
        return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
      }
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY
    if (!RESEND_API_KEY) {
      return NextResponse.json({
        error: 'Email niet geconfigureerd',
        hint: 'Voeg RESEND_API_KEY toe aan .env.local',
      }, { status: 503 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://cueboard.app'
    const inviteLink = `${appUrl}/invite/${invitation.token}`
    const showName   = (invitation.shows as { name: string } | null)?.name ?? 'een show'
    const roleName   = ROLE_LABELS[invitation.role] ?? invitation.role
    const roleDescr  = ROLE_DESC[invitation.role] ?? ''

    // Haal de naam van de uitnodiger op
    const { data: inviterProfile } = invitation.invited_by
      ? await supabase.from('profiles').select('full_name, email').eq('id', invitation.invited_by).single()
      : { data: null }
    const inviterName = inviterProfile?.full_name || inviterProfile?.email || 'Iemand'

    // Stuur e-mail via Resend API
    const emailResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    'CueBoard <noreply@cueboard.app>',
        to:      [invitation.email],
        subject: `${inviterName} nodigt je uit voor ${showName}`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 40px 20px; }
    .container { max-width: 480px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 32px; border: 1px solid #334155; }
    .logo { font-size: 20px; font-weight: 700; color: #818cf8; letter-spacing: 2px; margin-bottom: 24px; }
    .logo span { font-weight: 300; color: #c7d2fe; }
    h1 { font-size: 22px; font-weight: 600; margin: 0 0 8px; color: #f1f5f9; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 8px 0; }
    .role-badge { display: inline-block; background: #1e3a5f; color: #60a5fa; border: 1px solid #2563eb40; border-radius: 6px; padding: 4px 10px; font-size: 13px; font-weight: 500; margin: 12px 0; }
    .btn { display: block; background: #6366f1; color: white !important; text-decoration: none; text-align: center; padding: 14px 24px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 24px 0; }
    .footer { font-size: 12px; color: #475569; margin-top: 24px; border-top: 1px solid #334155; padding-top: 16px; }
    .link { color: #818cf8; word-break: break-all; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">CUE<span>BOARD</span></div>
    <h1>Je bent uitgenodigd!</h1>
    <p><strong style="color:#f1f5f9">${inviterName}</strong> nodigt je uit om deel te nemen aan:</p>
    <p style="color:#f1f5f9; font-size: 18px; font-weight: 600; margin: 12px 0;">${showName}</p>
    <div class="role-badge">🎭 ${roleName}</div>
    <p>${roleDescr}</p>
    <a href="${inviteLink}" class="btn">Uitnodiging accepteren →</a>
    <p>Of kopieer deze link:</p>
    <p class="link">${inviteLink}</p>
    <div class="footer">
      <p>Deze uitnodiging verloopt op ${new Date(invitation.expires_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>
      <p>CueBoard – Real-time show control voor live events</p>
    </div>
  </div>
</body>
</html>
        `.trim(),
      }),
    })

    if (!emailResp.ok) {
      const errBody = await emailResp.json().catch(() => ({}))
      console.error('Resend error:', errBody)
      return NextResponse.json({ error: 'E-mail versturen mislukt', details: errBody }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Invite API error:', err)
    return NextResponse.json({ error: 'Onbekende fout' }, { status: 500 })
  }
}
