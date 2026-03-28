/**
 * Server-side plan gate helpers
 *
 * Gebruik deze functies in API routes en server components om te controleren
 * of een gebruiker binnen zijn planlimiet zit.
 *
 * Voorbeeld:
 *   const gate = await checkPlanGate(userId, 'max_shows')
 *   if (!gate.allowed) return NextResponse.json({ error: gate.message, upgrade: true }, { status: 403 })
 */

import { createClient } from '@/lib/supabase/server'
import { getPlanLimits, withinLimit } from '@/lib/plans'
import type { Plan } from '@/lib/plans'

interface GateResult {
  allowed: boolean
  message: string
  plan: Plan
  limit: number
  current: number
}

type GateFeature = 'max_shows' | 'max_rundowns_per_show' | 'max_cues_per_rundown' | 'max_members_per_show' | 'max_cast_members'

/**
 * Controleer of een gebruiker een nieuwe resource mag aanmaken
 */
export async function checkPlanGate(
  userId: string,
  feature: GateFeature,
  currentCount: number
): Promise<GateResult> {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at')
    .eq('id', userId)
    .single()

  const plan = (profile?.plan ?? 'free') as Plan
  const expiresAt = profile?.plan_expires_at ?? null
  const limits = getPlanLimits(plan, expiresAt)
  const limit = limits[feature] as number

  const FEATURE_LABELS: Record<GateFeature, string> = {
    max_shows:             'shows',
    max_rundowns_per_show: 'rundowns per show',
    max_cues_per_rundown:  'cues per rundown',
    max_members_per_show:  'teamleden per show',
    max_cast_members:      'cast members',
  }

  const allowed = withinLimit(plan, expiresAt, feature, currentCount)

  return {
    allowed,
    plan,
    limit,
    current: currentCount,
    message: allowed
      ? 'OK'
      : `Je ${plan === 'free' ? 'gratis plan' : plan + '-plan'} staat maximaal ${
          limit === Infinity ? 'onbeperkt' : limit
        } ${FEATURE_LABELS[feature]} toe. Upgrade je plan om meer aan te maken.`,
  }
}

/**
 * Controleer of een feature (boolean) beschikbaar is voor een gebruiker
 */
export async function checkFeatureAccess(
  userId: string,
  feature: 'companion' | 'slide_upload' | 'mic_patch'
): Promise<{ allowed: boolean; plan: Plan; message: string }> {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at')
    .eq('id', userId)
    .single()

  const plan = (profile?.plan ?? 'free') as Plan
  const expiresAt = profile?.plan_expires_at ?? null
  const limits = getPlanLimits(plan, expiresAt)
  const allowed = limits[feature] as boolean

  const FEATURE_LABELS: Record<string, string> = {
    companion:    'Bitfocus Companion integratie',
    slide_upload: 'presentatie-upload',
    mic_patch:    'mic patch panel',
  }

  return {
    allowed,
    plan,
    message: allowed
      ? 'OK'
      : `${FEATURE_LABELS[feature]} is niet beschikbaar in je ${plan === 'free' ? 'gratis plan' : plan + '-plan'}. Upgrade naar Pro of Team om dit te gebruiken.`,
  }
}
