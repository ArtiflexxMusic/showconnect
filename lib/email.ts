/**
 * CueBoard Email utility
 *
 * Ondersteunt twee providers (automatisch gekozen op basis van env vars):
 *
 *  1. Mailjet (aanbevolen – gratis 6000 mails/maand, geen domeinverificatie)
 *     Vereist: MAILJET_API_KEY + MAILJET_SECRET_KEY
 *     Setup: https://app.mailjet.com → API Keys
 *     Zet ook MAILJET_FROM_EMAIL op het geverifieerde afzenderadres
 *     (bijv. info@artiflexx.nl — Mailjet stuurt een verificatie-link)
 *
 *  2. Resend (fallback)
 *     Vereist: RESEND_API_KEY + geverifieerd domein in Resend Dashboard
 *     Setup: https://resend.com → API Keys + Domains
 *
 * Voeg de gekozen variabelen toe in Vercel Dashboard →
 * Settings → Environment Variables → Production
 */

const MAILJET_API_KEY    = process.env.MAILJET_API_KEY
const MAILJET_SECRET_KEY = process.env.MAILJET_SECRET_KEY
const MAILJET_FROM_EMAIL = process.env.MAILJET_FROM_EMAIL ?? 'info@artiflexx.nl'
const MAILJET_FROM_NAME  = process.env.MAILJET_FROM_NAME  ?? 'CueBoard'

const RESEND_API_KEY = process.env.RESEND_API_KEY

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.cueboard.nl'

export interface EmailResult {
  ok: boolean
  error?: string
}

// ── Mailjet verzender ─────────────────────────────────────────────────────────
async function sendViaMailjet(opts: { to: string; subject: string; html: string }): Promise<EmailResult> {
  const credentials = Buffer.from(`${MAILJET_API_KEY}:${MAILJET_SECRET_KEY}`).toString('base64')

  const res = await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      Messages: [
        {
          From:     { Email: MAILJET_FROM_EMAIL, Name: MAILJET_FROM_NAME },
          To:       [{ Email: opts.to }],
          Subject:  opts.subject,
          HTMLPart: opts.html,
        },
      ],
    }),
  })

  const body = await res.json().catch(() => ({}))

  if (!res.ok) {
    const err = body?.Messages?.[0]?.Errors?.[0]?.ErrorMessage ?? JSON.stringify(body)
    console.error('[email/mailjet] Versturen mislukt:', err)
    return { ok: false, error: err }
  }

  const msgStatus = body?.Messages?.[0]?.Status
  if (msgStatus && msgStatus !== 'success') {
    const err = `Mailjet status: ${msgStatus}`
    console.error('[email/mailjet]', err, body)
    return { ok: false, error: err }
  }

  return { ok: true }
}

// ── Resend verzender ──────────────────────────────────────────────────────────
async function sendViaResend(opts: { to: string; subject: string; html: string }): Promise<EmailResult> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from:    `${MAILJET_FROM_NAME} <${MAILJET_FROM_EMAIL}>`,
      to:      [opts.to],
      subject: opts.subject,
      html:    opts.html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[email/resend] Versturen mislukt:', err)
    return { ok: false, error: err }
  }

  return { ok: true }
}

// ── Hoofd sendEmail functie ───────────────────────────────────────────────────
export async function sendEmail(opts: {
  to: string
  subject: string
  html: string
}): Promise<EmailResult> {
  // Mailjet heeft prioriteit
  if (MAILJET_API_KEY && MAILJET_SECRET_KEY) {
    return sendViaMailjet(opts)
  }

  // Resend als fallback
  if (RESEND_API_KEY) {
    return sendViaResend(opts)
  }

  // Geen provider geconfigureerd
  console.warn('[email] Geen e-mailprovider geconfigureerd. Voeg MAILJET_API_KEY + MAILJET_SECRET_KEY toe aan Vercel Environment Variables.')
  return { ok: false, error: 'Geen e-mailprovider geconfigureerd (zie lib/email.ts voor instructies)' }
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
 * Mail: trial verloopt binnen 24 uur – herinnering
 */
export function buildTrialExpiringEmail(opts: {
  name: string | null
  trialEndsAt: string
}) {
  const displayName = opts.name ?? 'daar'
  const expiryDate  = new Date(opts.trialEndsAt).toLocaleDateString('nl-NL', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const upgradeUrl  = `${BASE_URL}/upgrade`

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">
      Je gratis trial verloopt morgen
    </h1>
    <p style="margin:0 0 24px;font-size:14px;color:#888;line-height:1.6;">
      Hoi ${displayName},
    </p>
    <p style="margin:0 0 16px;font-size:15px;color:#ccc;line-height:1.7;">
      Je gratis proefperiode van CueBoard loopt af op <strong style="color:#fff;">${expiryDate}</strong>.
      Daarna val je terug naar het gratis plan met beperkte functies.
    </p>
    <p style="margin:0 0 8px;font-size:15px;color:#ccc;line-height:1.7;">
      Upgrade nu en houd toegang tot alle functies:
    </p>
    <ul style="margin:12px 0 20px;padding-left:20px;color:#aaa;font-size:14px;line-height:1.8;">
      <li>Onbeperkte shows &amp; rundowns</li>
      <li>Slideshow-upload &amp; live-bediening</li>
      <li>Bitfocus Companion-integratie</li>
      <li>Mic patch &amp; cast panel</li>
    </ul>
    <a href="${upgradeUrl}" style="${btnStyle}">
      Plan kiezen →
    </a>
    <hr style="margin:32px 0;border:none;border-top:1px solid #222;" />
    <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">
      Vragen? <a href="mailto:info@artiflexx.nl" style="color:#f97316;text-decoration:none;">info@artiflexx.nl</a>
    </p>
  `

  return {
    subject: 'Je CueBoard-trial verloopt morgen',
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
