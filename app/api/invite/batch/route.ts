import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'
import { getPlanLimits, type Plan } from '@/lib/plans'
import type { ShowMemberRole } from '@/lib/types/database'

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

type ResultStatus = 'sent' | 'skipped' | 'error'
interface InviteResult {
  email: string
  status: ResultStatus
  message?: string
  invitationId?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

function buildInviteHtml(opts: {
  inviterName: string
  showName:    string
  roleName:    string
  roleDescr:   string
  inviteLink:  string
  expiryDate:  string
}) {
  return `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 40px 20px; }
    .container { max-width: 480px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 32px; border: 1px solid #334155; }
    .logo { font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: 2px; margin-bottom: 24px; }
    .logo .board { color: #22c55e; }
    h1 { font-size: 22px; font-weight: 600; margin: 0 0 8px; color: #f1f5f9; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 8px 0; }
    .role-badge { display: inline-block; background: #1e3a5f; color: #60a5fa; border: 1px solid #2563eb40; border-radius: 6px; padding: 4px 10px; font-size: 13px; font-weight: 500; margin: 12px 0; }
    .btn { display: block; background: #22c55e; color: white !important; text-decoration: none; text-align: center; padding: 14px 24px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 24px 0; }
    .footer { font-size: 12px; color: #475569; margin-top: 24px; border-top: 1px solid #334155; padding-top: 16px; }
    .link { color: #22c55e; word-break: break-all; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Cue<span class="board">Board</span></div>
    <h1>Je bent uitgenodigd!</h1>
    <p><strong style="color:#f1f5f9">${opts.inviterName}</strong> nodigt je uit om deel te nemen aan:</p>
    <p style="color:#f1f5f9; font-size: 18px; font-weight: 600; margin: 12px 0;">${opts.showName}</p>
    <div class="role-badge">🎭 ${opts.roleName}</div>
    <p>${opts.roleDescr}</p>
    <a href="${opts.inviteLink}" class="btn">Uitnodiging accepteren →</a>
    <p>Of kopieer deze link:</p>
    <p class="link">${opts.inviteLink}</p>
    <div class="footer">
      <p>Deze uitnodiging verloopt op ${opts.expiryDate}.</p>
      <p>CueBoard – Real-time show control voor live events</p>
    </div>
  </div>
</body>
</html>`.trim()
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

    const body = await req.json().catch(() => null) as {
      showId?: string
      emails?: string[]
      role?: ShowMemberRole
    } | null

    const showId = body?.showId
    const role   = body?.role
    const emails = body?.emails ?? []

    if (!showId || !role || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'showId, role en minimaal één email zijn vereist' }, { status: 400 })
    }

    if (emails.length > 50) {
      return NextResponse.json({ error: 'Maximaal 50 emails per keer' }, { status: 400 })
    }

    // Check platform admin eerst: die mag overal uitnodigen
    const { data: callerProfile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    const isPlatformAdmin = callerProfile?.role === 'admin' || callerProfile?.role === 'beheerder'

    // Show + eigenaar-profile ophalen (plan voor limieten)
    const { data: show, error: showErr } = await supabase
      .from('shows').select('id, name, created_by').eq('id', showId).single()
    if (showErr || !show) {
      return NextResponse.json({ error: 'Show niet gevonden' }, { status: 404 })
    }

    // Permissie-check: moet owner of editor zijn
    if (!isPlatformAdmin) {
      const { data: membership } = await supabase
        .from('show_members')
        .select('role')
        .eq('show_id', showId)
        .eq('user_id', user.id)
        .single()
      if (!membership || !['owner', 'editor'].includes(membership.role)) {
        return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
      }
    }

    // Eigenaar-plan ophalen voor limieten
    const admin = adminClient()
    const { data: ownerProfile } = await admin
      .from('profiles')
      .select('plan, plan_expires_at, trial_ends_at')
      .eq('id', show.created_by)
      .single()

    const limits = getPlanLimits(
      (ownerProfile?.plan as Plan) ?? 'free',
      ownerProfile?.plan_expires_at ?? null,
      ownerProfile?.trial_ends_at ?? null
    )

    // Huidige bezetting tellen: members + niet-verlopen pending invites
    const nowIso = new Date().toISOString()
    const [{ count: memberCount }, { data: pendingInv }] = await Promise.all([
      admin.from('show_members').select('id', { count: 'exact', head: true }).eq('show_id', showId),
      admin.from('invitations')
        .select('email, expires_at, accepted_at')
        .eq('show_id', showId)
        .is('accepted_at', null)
        .gt('expires_at', nowIso),
    ])

    const pendingEmails = new Set((pendingInv ?? []).map(i => i.email.toLowerCase()))
    const usedSlots = (memberCount ?? 0) + pendingEmails.size
    let remaining = Math.max(0, limits.max_members_per_show - usedSlots)

    // Bestaande leden-emails ophalen (via profiles lookup)
    const { data: memberRows } = await admin
      .from('show_members')
      .select('user_id')
      .eq('show_id', showId)
    const memberUserIds = (memberRows ?? []).map(r => r.user_id)
    const { data: memberProfiles } = memberUserIds.length > 0
      ? await admin.from('profiles').select('email').in('id', memberUserIds)
      : { data: [] as { email: string }[] }
    const memberEmails = new Set((memberProfiles ?? []).map(p => p.email.toLowerCase()))

    // Inviter-naam
    const { data: inviterProfile } = await supabase
      .from('profiles').select('full_name, email').eq('id', user.id).single()
    const inviterName = inviterProfile?.full_name || inviterProfile?.email || 'Iemand'

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cueboard.nl'
    const roleName  = ROLE_LABELS[role] ?? role
    const roleDescr = ROLE_DESC[role] ?? ''

    // Dedupe + normaliseren
    const seen = new Set<string>()
    const normalized: string[] = []
    for (const raw of emails) {
      const e = String(raw).trim().toLowerCase()
      if (!e || seen.has(e)) continue
      seen.add(e)
      normalized.push(e)
    }

    const results: InviteResult[] = []

    for (const email of normalized) {
      if (!EMAIL_RE.test(email)) {
        results.push({ email, status: 'error', message: 'Ongeldig e-mailadres' })
        continue
      }
      if (memberEmails.has(email)) {
        results.push({ email, status: 'skipped', message: 'Al lid van deze show' })
        continue
      }
      if (pendingEmails.has(email)) {
        results.push({ email, status: 'skipped', message: 'Uitnodiging staat al open' })
        continue
      }
      if (remaining <= 0) {
        results.push({ email, status: 'error', message: 'Plan-limiet bereikt, upgrade om meer leden toe te voegen' })
        continue
      }

      // Invitation aanmaken
      const { data: inv, error: invErr } = await admin
        .from('invitations')
        .insert({
          show_id:    showId,
          email,
          role,
          invited_by: user.id,
        })
        .select('id, token, expires_at')
        .single()

      if (invErr || !inv) {
        console.error('Batch invite insert error:', invErr)
        results.push({ email, status: 'error', message: `Aanmaken mislukt: ${invErr?.message ?? 'onbekend'}` })
        continue
      }

      remaining -= 1
      pendingEmails.add(email)

      // Mail versturen (fouten breken batch niet af, invitation blijft staan)
      const inviteLink = `${appUrl}/invite/${inv.token}`
      const expiryDate = new Date(inv.expires_at).toLocaleDateString('nl-NL', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
      const html = buildInviteHtml({
        inviterName, showName: show.name, roleName, roleDescr, inviteLink, expiryDate,
      })

      const mailRes = await sendEmail({
        to: email,
        subject: `${inviterName} nodigt je uit voor ${show.name}`,
        html,
      })

      if (mailRes.ok) {
        results.push({ email, status: 'sent', invitationId: inv.id })
      } else {
        results.push({
          email,
          status: 'error',
          message: `Uitnodiging aangemaakt, maar e-mail mislukte (${mailRes.error ?? 'onbekend'}). Gebruik "Mail" om opnieuw te proberen.`,
          invitationId: inv.id,
        })
      }
    }

    const summary = results.reduce(
      (acc, r) => ({ ...acc, [r.status]: acc[r.status] + 1 }),
      { sent: 0, skipped: 0, error: 0 } as Record<ResultStatus, number>
    )

    return NextResponse.json({ results, summary })
  } catch (err) {
    console.error('Batch invite API error:', err)
    return NextResponse.json({ error: 'Onbekende fout' }, { status: 500 })
  }
}
