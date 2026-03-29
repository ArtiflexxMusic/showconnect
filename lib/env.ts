/**
 * Gevalideerde omgevingsvariabelen.
 *
 * Importeer altijd uit dit bestand i.p.v. process.env direct te gebruiken.
 * Gooit een duidelijke fout bij ontbrekende verplichte variabelen.
 */

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(
      `Verplichte omgevingsvariabele ontbreekt: ${key}\n` +
      `Voeg "${key}=..." toe aan .env.local (en Vercel project settings).`
    )
  }
  return value
}

function optionalEnv(key: string): string | undefined {
  return process.env[key] || undefined
}

// ── Verplicht ──────────────────────────────────────────────────────────────
export const SUPABASE_URL         = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
export const SUPABASE_ANON_KEY    = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
export const SUPABASE_SERVICE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

// ── Optioneel ──────────────────────────────────────────────────────────────
export const CRON_SECRET          = optionalEnv('CRON_SECRET')
export const RESEND_API_KEY       = optionalEnv('RESEND_API_KEY')
export const MAILJET_API_KEY      = optionalEnv('MAILJET_API_KEY')
export const MAILJET_SECRET_KEY   = optionalEnv('MAILJET_SECRET_KEY')
export const MOLLIE_API_KEY       = optionalEnv('MOLLIE_API_KEY')
export const APP_URL              = process.env.NEXT_PUBLIC_APP_URL ?? 'https://cueboard.nl'

// ── Web Push / VAPID ────────────────────────────────────────────────────────
// Genereer nieuwe keys met: node scripts/gen-vapid-keys.js
// Stel in als VAPID_PUBLIC_KEY en VAPID_PRIVATE_KEY in .env.local + Vercel
export const VAPID_PUBLIC_KEY     = optionalEnv('VAPID_PUBLIC_KEY')
export const VAPID_PRIVATE_KEY    = optionalEnv('VAPID_PRIVATE_KEY')
export const VAPID_SUBJECT        = process.env.VAPID_SUBJECT ?? 'mailto:info@artiflexx.nl'
// De public key is ook nodig op de client; zet hem in NEXT_PUBLIC_VAPID_PUBLIC_KEY
export const NEXT_PUBLIC_VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
