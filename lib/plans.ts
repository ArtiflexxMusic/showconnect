/**
 * CueBoard Plan Systeem
 *
 * Drie plannen: free | pro | team
 * Twee bronnen:  free | gift (handmatig door admin) | paid (via Mollie)
 */

/** Platform-admin rollen. Gebruik deze constante voor alle admin-checks. */
export const ADMIN_ROLES = ['admin', 'beheerder'] as const
export type AdminRole = typeof ADMIN_ROLES[number]

/** Geeft true als het profiel platform-admin rechten heeft */
export function isPlatformAdmin(role: string | null | undefined): boolean {
  return ADMIN_ROLES.includes(role as AdminRole)
}

export type Plan         = 'free' | 'pro' | 'team'
export type PlanSource   = 'free' | 'gift' | 'paid'
export type PlanInterval = 'monthly' | 'yearly'

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
  free: 'Individual',
  pro:  'Team',
  team: 'Business',
}

/** Prijs in euro's per plan + interval */
export const PLAN_PRICES: Record<Plan, number | null> = {
  free: null,
  pro:  9.99,
  team: 29.99,
}

export const PLAN_PRICES_MONTHLY: Partial<Record<Plan, number>> = {
  pro:  9.99,
  team: 29.99,
}

export const PLAN_PRICES_YEARLY: Partial<Record<Plan, number>> = {
  pro:  99.99,
  team: 299.99,
}

/** Geeft de prijs als formatted string: "9,95" */
export function formatPrice(amount: number): string {
  return amount.toFixed(2).replace('.', ',')
}

/** Geeft de besparing bij jaarabonnement t.o.v. 12 × maand */
export function yearlySaving(plan: Plan): number {
  const monthly = PLAN_PRICES_MONTHLY[plan] ?? 0
  const yearly  = PLAN_PRICES_YEARLY[plan] ?? 0
  return Math.round(monthly * 12 - yearly)
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

/** Geeft true als een gebruiker een actieve trial heeft */
export function isTrialActive(trialEndsAt: string | null | undefined): boolean {
  if (!trialEndsAt) return false
  return new Date(trialEndsAt) > new Date()
}

/** Geeft de limieten terug voor een plan, rekening houdend met verloopdatum en trial */
export function getPlanLimits(
  plan: Plan,
  planExpiresAt: string | null,
  trialEndsAt?: string | null
): PlanLimits {
  // Actieve trial op free plan → tijdelijk team-limieten
  if (plan === 'free' && isTrialActive(trialEndsAt)) {
    return PLAN_LIMITS.team
  }

  if (plan === 'free') return PLAN_LIMITS.free

  // Check verloopdatum betaald plan
  if (planExpiresAt && new Date(planExpiresAt) < new Date()) {
    return PLAN_LIMITS.free
  }

  return PLAN_LIMITS[plan]
}

/** Geeft true als de gebruiker toegang heeft tot een feature */
export function canUse(
  plan: Plan,
  planExpiresAt: string | null,
  feature: keyof PlanLimits,
  trialEndsAt?: string | null
): boolean {
  const limits = getPlanLimits(plan, planExpiresAt, trialEndsAt)
  const val = limits[feature]
  if (typeof val === 'boolean') return val
  return (val as number) > 0
}

/** Geeft true als de gebruiker een actie kan uitvoeren binnen zijn limiet */
export function withinLimit(
  plan: Plan,
  planExpiresAt: string | null,
  feature: 'max_shows' | 'max_rundowns_per_show' | 'max_cues_per_rundown' | 'max_members_per_show' | 'max_cast_members',
  currentCount: number,
  trialEndsAt?: string | null
): boolean {
  const limits = getPlanLimits(plan, planExpiresAt, trialEndsAt)
  const max = limits[feature]
  return currentCount < max
}
