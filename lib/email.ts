/**
 * CueBoard Email utility via Resend
 * Gedeelde helper voor het versturen van transactionele mails
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL     = 'CueBoard <noreply@cueboard.nl>'
const BASE_URL       = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cueboard.nl'

export interface EmailResult {
  ok: boolean
  error?: string
}

export async function sendEmail(opts: {
  to: string
  subject: string
  html: string
}): Promise<EmailResult> {
  if (!RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY niet geconfigureerd — mail niet verstuurd')
    return { ok: false, error: 'RESEND_API_KEY ontbreekt' }
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:    FROM_EMAIL,
      to:      [opts.to],
      subject: opts.subject,
      html:    opts.html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[email] Versturen mislukt:', err)
    return { ok: false, error: err }
  }

  return { ok: true }
}

// ── Email templates ──────────────────────────────────────────────────────────

const emailBase = (content: string) => `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CueBoard</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                Cue<span style="color:#f97316;">Board</span>
              </span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#141414;border:1px solid #222;border-radius:12px;padding:40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#555;">
                CueBoard · <a href="${BASE_URL}" style="color:#555;text-decoration:none;">cueboard.nl</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

const btnStyle = 'display:inline-block;background:#f97316;color:#ffffff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;margin-top:24px;'

/**
 * Mail: plan upgrade naar betaald — verzoek tot afronden betaling
 */
export function buildPaymentRequestEmail(opts: {
  name: string | null
  plan: 'pro' | 'team'
  paymentUrl?: string
}) {
  const displayName = opts.name ?? 'daar'
  const planLabel   = opts.plan === 'pro' ? 'Pro (€9,95/mnd)' : 'Team (€29,95/mnd)'
  const paymentUrl  = opts.paymentUrl ?? `${BASE_URL}/upgrade`

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">
      Jouw CueBoard-account is bijgewerkt
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#888;line-height:1.6;">
      Hoi ${displayName},
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#ccc;line-height:1.7;">
      Je account is ingesteld op het <strong style="color:#fff;">${planLabel}</strong>-plan.
      Om je toegang te activeren en te behouden, verzoeken wij je de betaling af te ronden.
    </p>
    <p style="margin:0 0 8px;font-size:15px;color:#ccc;line-height:1.7;">
      Klik op de knop hieronder om verder te gaan:
    </p>
    <a href="${paymentUrl}" style="${btnStyle}">
      Betaling afronden →
    </a>
    <hr style="margin:32px 0;border:none;border-top:1px solid #222;" />
    <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">
      Heb je vragen? Stuur een mail naar
      <a href="mailto:info@artiflexx.nl" style="color:#f97316;text-decoration:none;">info@artiflexx.nl</a>.
    </p>
  `

  return {
    subject: `Activeer je CueBoard ${opts.plan === 'pro' ? 'Pro' : 'Team'}-plan`,
    html:    emailBase(content),
  }
}

/**
 * Mail: 3-daagse trial gestart (welkomstmail voor nieuwe gebruikers)
 */
export function buildTrialWelcomeEmail(opts: {
  name: string | null
}) {
  const displayName = opts.name ?? 'daar'

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">
      Welkom bij CueBoard! 🎉
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#888;line-height:1.6;">
      Hoi ${displayName},
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#ccc;line-height:1.7;">
      Je account is aangemaakt en je hebt <strong style="color:#fff;">3 dagen volledig toegang</strong>
      tot alle functies van CueBoard — inclusief Companion-integratie, slideshow-upload, mic patch en onbeperkte shows.
    </p>
    <p style="margin:0 0 8px;font-size:15px;color:#ccc;line-height:1.7;">
      Verken alles en kies daarna het plan dat het beste bij jou past:
    </p>
    <a href="${BASE_URL}/upgrade" style="${btnStyle}">
      Aan de slag →
    </a>
    <hr style="margin:32px 0;border:none;border-top:1px solid #222;" />
    <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">
      Vragen? <a href="mailto:info@artiflexx.nl" style="color:#f97316;text-decoration:none;">info@artiflexx.nl</a>
    </p>
  `

  return {
    subject: 'Welkom bij CueBoard — 3 dagen gratis toegang',
    html: emailBase(content),
  }
}

/**
 * Mail: plan verlopen → teruggevallen naar Free
 */
export function buildPlanExpiredEmail(opts: {
  name: string | null
  previousPlan: 'pro' | 'team'
}) {
  const displayName  = opts.name ?? 'daar'
  const planLabel    = opts.previousPlan === 'pro' ? 'Pro' : 'Team'
  const upgradeUrl   = `${BASE_URL}/upgrade`

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">
      Je ${planLabel}-plan is verlopen
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#888;line-height:1.6;">
      Hoi ${displayName},
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#ccc;line-height:1.7;">
      Je tijdelijke toegang tot het <strong style="color:#fff;">${planLabel}</strong>-plan is verlopen.
      Je account is teruggevallen naar het gratis plan.
    </p>
    <p style="margin:0 0 8px;font-size:15px;color:#ccc;line-height:1.7;">
      Wil je de uitgebreide functies behouden? Upgrade dan naar een betaald plan:
    </p>
    <a href="${upgradeUrl}" style="${btnStyle}">
      Plan upgraden →
    </a>
    <hr style="margin:32px 0;border:none;border-top:1px solid #222;" />
    <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">
      Vragen? <a href="mailto:info@artiflexx.nl" style="color:#f97316;text-decoration:none;">info@artiflexx.nl</a>
    </p>
  `

  return {
    subject: `Je CueBoard ${planLabel}-plan is verlopen`,
    html:    emailBase(content),
  }
}

/**
 * Mail: admin heeft een gebruiker uitgenodigd
 * (aanvullend op de Supabase invite-mail — optioneel te versturen)
 */
export function buildInviteEmail(opts: {
  name: string | null
  invitedBy?: string | null
}) {
  const displayName = opts.name ?? 'daar'
  const invitedBy   = opts.invitedBy ?? 'een beheerder'

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">
      Je bent uitgenodigd voor CueBoard
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#888;line-height:1.6;">
      Hoi ${displayName},
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#ccc;line-height:1.7;">
      ${invitedBy} heeft je uitgenodigd om CueBoard te gebruiken.
      Je krijgt <strong style="color:#fff;">3 dagen gratis toegang</strong> tot alle functies.
    </p>
    <p style="margin:0 0 8px;font-size:15px;color:#ccc;line-height:1.7;">
      Klik op de knop in de uitnodigingsmail om je account aan te maken en direct aan de slag te gaan:
    </p>
    <a href="${BASE_URL}" style="${btnStyle}">
      Account aanmaken →
    </a>
    <hr style="margin:32px 0;border:none;border-top:1px solid #222;" />
    <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">
      Vragen? <a href="mailto:info@artiflexx.nl" style="color:#f97316;text-decoration:none;">info@artiflexx.nl</a>
    </p>
  `

  return {
    subject: 'Je bent uitgenodigd voor CueBoard',
    html:    emailBase(content),
  }
}
