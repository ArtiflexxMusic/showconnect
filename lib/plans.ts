/**
 * CueBoard Plan Systeem
 *
 * Drie plannen: free | pro | team
 * Twee bronnen:  free | gift (handmatig door admin) | paid (via Mollie)
 */

export type Plan       = 'free' | 'pro' | 'team'
export type PlanSource = 'free' | 'gift' | 'paid'

export interface PlanLimits {
  max_shows:              number   // Infinity = onbeperkt
  max_rundowns_per_show:  number
  max_cues_per_rundown:   number
  max_members_per_show:   number
  max_cast_members:       number   // 0 = cast panel niet beschikbaar
  companion:              boolean  // Bitfocus Companion integratie
  slide_upload:           boolean  // Presentatie-upload
  mic_patch:              boolean  // Mic patch panel
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    max_shows:             1,
    max_rundowns_per_show: 1,
    max_cues_per_rundown:  15,
    max_members_per_show:  2,
    max_cast_members:      0,      // Cast panel niet beschikbaar
    companion:             false,
    slide_upload:          false,
    mic_patch:             false,
  },
  pro: {
    max_shows:             5,
    max_rundowns_per_show: 3,
    max_cues_per_rundown:  Infinity,
    max_members_per_show:  5,
    max_cast_members:      1,      // 1 cast member
    companion:             true,
    slide_upload:          true,
    mic_patch:             true,
  },
  team: {
    max_shows:             Infinity,
    max_rundowns_per_show: Infinity,
    max_cues_per_rundown:  Infinity,
    max_members_per_show:  Infinity,
    max_cast_members:      Infinity, // Onbeperkt
    companion:             true,
    slide_upload:          true,
    mic_patch:             true,
  },
}

export const PLAN_LABELS: Record<Plan, string> = {
  free: 'Free',
  pro:  'Pro',
  team: 'Team',
}

export const PLAN_PRICES: Record<Plan, number | null> = {
  free: null,
  pro:  9.95,
  team: 29.95,
}

export const PLAN_COLORS: Record<Plan, string> = {
  free: 'bg-muted text-muted-foreground border-border',
  pro:  'bg-primary/15 text-primary border-primary/30',
  team: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
}

export const PLAN_SOURCE_LABELS: Record<PlanSource, string> = {
  free: 'Gratis',
  gift: 'Cadeau',
  paid: 'Betaald',
}

export const PLAN_SOURCE_COLORS: Record<PlanSource, string> = {
  free: 'text-muted-foreground',
  gift: 'text-amber-400',
  paid: 'text-emerald-400',
}

/** Geeft de limieten terug voor een plan, rekening houdend met verloopdatum */
export function getPlanLimits(
  plan: Plan,
  planExpiresAt: string | null
): PlanLimits {
  if (plan === 'free') return PLAN_LIMITS.free

  // Check verloopdatum
  if (planExpiresAt && new Date(planExpiresAt) < new Date()) {
    return PLAN_LIMITS.free
  }

  return PLAN_LIMITS[plan]
}

/** Geeft true als de gebruiker toegang heeft tot een feature */
export function canUse(
  plan: Plan,
  planExpiresAt: string | null,
  feature: keyof PlanLimits
): boolean {
  const limits = getPlanLimits(plan, planExpiresAt)
  const val = limits[feature]
  if (typeof val === 'boolean') return val
  return (val as number) > 0
}

/** Geeft true als de gebruiker een actie kan uitvoeren binnen zijn limiet */
export function withinLimit(
  plan: Plan,
  planExpiresAt: string | null,
  feature: 'max_shows' | 'max_rundowns_per_show' | 'max_cues_per_rundown' | 'max_members_per_show' | 'max_cast_members',
  currentCount: number
): boolean {
  const limits = getPlanLimits(plan, planExpiresAt)
  const max = limits[feature]
  return currentCount < max
}
