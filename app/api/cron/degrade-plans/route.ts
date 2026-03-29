/**
 * GET /api/cron/degrade-plans
 *
 * Vercel Cron – draait dagelijks om 03:00 UTC.
 * Taken:
 *  1. Verlopen betaalde plannen terugzetten naar Free + mail sturen
 *  2. Trial-herinnering sturen als trial binnen 24u verloopt
 *
 * Beveiligd met CRON_SECRET (Vercel voegt Authorization-header toe).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  sendEmail,
  buildPlanExpiredEmail,
  buildTrialExpiringEmail,
} from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // ── Beveiligingscheck ──────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const now     = new Date()
  const in24h   = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const ago24h  = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  let degraded = 0
  let reminded = 0
  const errors: string[] = []

  // ── 1. Verlopen betaalde plannen degraderen ────────────────────────────────
  // Zoek profielen waarbij het betaald plan is verlopen (plan_source = 'paid')
  const { data: expiredProfiles, error: expErr } = await supabase
    .from('profiles')
    .select('id, email, full_name, plan, plan_expires_at, plan_source')
    .eq('plan_source', 'paid')
    .neq('plan', 'free')
    .lt('plan_expires_at', now.toISOString())
    .gte('plan_expires_at', ago24h.toISOString()) // Alleen afgelopen 24u (1x per dag)

  if (expErr) {
    errors.push(`Ophalen verlopen plannen: ${expErr.message}`)
  } else if (expiredProfiles && expiredProfiles.length > 0) {
    for (const profile of expiredProfiles) {
      // Plan terugzetten naar free
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          plan:           'free',
          plan_source:    'free',
          plan_interval:  null,
        })
        .eq('id', profile.id)

      if (updateErr) {
        errors.push(`Degraderen ${profile.id}: ${updateErr.message}`)
        continue
      }

      degraded++

      // Notificatie-mail sturen
      if (profile.email) {
        const mail = buildPlanExpiredEmail({
          name:         profile.full_name,
          previousPlan: profile.plan as 'pro' | 'team',
        })
        const result = await sendEmail({ to: profile.email, ...mail })
        if (!result.ok) {
          errors.push(`Mail verlopen plan ${profile.email}: ${result.error}`)
        }
      }
    }
  }

  // ── 2. Trial-herinnering sturen ────────────────────────────────────────────
  // Stuur herinnering als trial binnen 24u verloopt (maar nog niet verlopen)
  const { data: expiringTrials, error: trialErr } = await supabase
    .from('profiles')
    .select('id, email, full_name, trial_ends_at, plan')
    .eq('plan', 'free')           // Alleen free-plan gebruikers
    .eq('plan_source', 'free')    // Niet al betaald
    .gt('trial_ends_at', now.toISOString())        // Trial nog niet verlopen
    .lte('trial_ends_at', in24h.toISOString())     // Maar verloopt binnen 24u

  if (trialErr) {
    errors.push(`Ophalen verlopende trials: ${trialErr.message}`)
  } else if (expiringTrials && expiringTrials.length > 0) {
    for (const profile of expiringTrials) {
      if (profile.email && profile.trial_ends_at) {
        const mail = buildTrialExpiringEmail({
          name:         profile.full_name,
          trialEndsAt:  profile.trial_ends_at,
        })
        const result = await sendEmail({ to: profile.email, ...mail })
        if (result.ok) {
          reminded++
        } else {
          errors.push(`Trial-herinnering ${profile.email}: ${result.error}`)
        }
      }
    }
  }

  if (errors.length > 0) {
    console.error(`[cron/degrade-plans] Fouten (${errors.length}):`, errors)
  }

  return NextResponse.json({
    ok:       true,
    degraded,
    reminded,
    errors:   errors.length > 0 ? errors : undefined,
    ran_at:   now.toISOString(),
  })
}
