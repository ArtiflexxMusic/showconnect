'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Check, Zap, Users, Loader2, ArrowLeft, X,
  Gift, CalendarClock, AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UpgradeClientProps {
  currentPlan:    'free' | 'pro' | 'team'
  planSource:     'free' | 'gift' | 'paid' | null
  planExpiresAt:  string | null
  planInterval:   'monthly' | 'yearly' | null
  hasSubscription: boolean
}

// ─── Plan definitie ───────────────────────────────────────────────────────────

const PLAN_ORDER = { free: 0, pro: 1, team: 2 } as const

const PLANS = [
  {
    key:     'free' as const,
    name:    'Free',
    icon:    Gift,
    color:   'text-muted-foreground',
    border:  'border-border',
    badge:   'bg-muted text-muted-foreground',
    price:   null,
    features: [
      '1 show',
      '1 rundown per show',
      'Max 15 cues',
      '2 teamleden per show',
      'Geen uploads',
      'Geen Companion integratie',
    ],
  },
  {
    key:     'pro' as const,
    name:    'Pro',
    icon:    Zap,
    color:   'text-primary',
    border:  'border-primary/30',
    badge:   'bg-primary/15 text-primary',
    monthly: { variant: 'pro_monthly', price: '9,95' },
    yearly:  { variant: 'pro_yearly',  price: '99,99', saving: '€19' },
    features: [
      'Tot 5 shows',
      'Tot 3 rundowns per show',
      'Onbeperkt cues',
      'Tot 5 teamleden per show',
      'Presentatie-upload (PDF / PPTX)',
      'Bitfocus Companion integratie',
      'Mic patch panel',
    ],
  },
  {
    key:     'team' as const,
    name:    'Team',
    icon:    Users,
    color:   'text-violet-400',
    border:  'border-violet-500/30',
    badge:   'bg-violet-500/15 text-violet-400',
    monthly: { variant: 'team_monthly', price: '29,99' },
    yearly:  { variant: 'team_yearly',  price: '299,99', saving: '€60' },
    features: [
      'Onbeperkt shows',
      'Onbeperkt rundowns',
      'Onbeperkt cues',
      'Onbeperkt teamleden',
      'Onbeperkt cast members',
      'Alles van Pro',
      'Prioriteitsondersteuning',
    ],
    popular: true,
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function UpgradeClient({
  currentPlan,
  planSource,
  planExpiresAt,
  planInterval,
  hasSubscription,
}: UpgradeClientProps) {
  const router  = useRouter()
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>(
    planInterval ?? 'monthly'
  )
  const [loading,       setLoading]       = useState<string | null>(null)
  const [error,         setError]         = useState<string | null>(null)
  const [cancelling,    setCancelling]    = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const isPaid        = planSource === 'paid'
  const isGift        = planSource === 'gift'
  const planExpired   = planExpiresAt ? new Date(planExpiresAt) < new Date() : false
  const isActivePaid  = isPaid  && !planExpired
  const isActiveGift  = isGift  && !planExpired
  const isActivePlan  = (isPaid || isGift) && !planExpired   // actief betaald óf cadeau

  async function handleCheckout(variantKey: string) {
    setLoading(variantKey)
    setError(null)
    try {
      const res  = await fetch('/api/mollie/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ variant: variantKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Checkout mislukt')
      window.location.href = data.url
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Er is iets misgegaan')
      setLoading(null)
    }
  }

  async function handleCancel() {
    setCancelling(true)
    setError(null)
    try {
      const res  = await fetch('/api/mollie/cancel', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Opzeggen mislukt')
      router.refresh()
      setShowCancelConfirm(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Opzeggen mislukt')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 sm:space-y-10">

        {/* Header */}
        <div className="space-y-2">
          <Button
            variant="ghost" size="sm"
            className="gap-1.5 text-muted-foreground -ml-2"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Terug
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Plannen</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {isActiveGift
              ? `Je hebt een cadeau ${currentPlan === 'pro' ? 'Pro' : 'Team'} plan`
              : isActivePaid
                ? `Je gebruikt het ${currentPlan === 'pro' ? 'Pro' : 'Team'} plan`
                : 'Kies het plan dat bij jouw gebruik past'}
          </p>
        </div>

        {/* Huidig plan info banner */}
        {isActivePlan && planExpiresAt && (
          <div className={cn(
            'flex items-start gap-3 rounded-xl border p-4 text-sm',
            isActiveGift
              ? 'border-amber-500/30 bg-amber-500/10'
              : 'border-border bg-muted/30'
          )}>
            {isActiveGift
              ? <Gift className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              : <CalendarClock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            }
            <div>
              {isActiveGift ? (
                <>
                  <p className="font-medium text-amber-300">Cadeau plan actief</p>
                  <p className="text-muted-foreground mt-0.5">
                    Je gebruikt een cadeau-abonnement, geldig tot{' '}
                    <span className="text-foreground">
                      {new Date(planExpiresAt).toLocaleDateString('nl-NL', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </span>
                    . Wil je daarna doorgaan? Kies dan een betaald plan hieronder.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium">
                    {hasSubscription ? 'Volgende verlenging' : 'Plan actief tot'}{' '}
                    <span className="text-foreground">
                      {new Date(planExpiresAt).toLocaleDateString('nl-NL', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </span>
                  </p>
                  {!hasSubscription && (
                    <p className="text-muted-foreground mt-0.5">
                      Wordt niet automatisch verlengd — verleng hieronder als je wilt doorgaan.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Interval toggle (alleen zichtbaar voor niet-free plannen) */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1 w-fit">
          <button
            onClick={() => setBillingInterval('monthly')}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              billingInterval === 'monthly'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Maandelijks
          </button>
          <button
            onClick={() => setBillingInterval('yearly')}
            className={cn(
              'px-3 sm:px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
              billingInterval === 'yearly'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Jaarlijks
            <span className="hidden sm:inline text-xs bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-full font-medium">
              Bespaar tot 2 mnd
            </span>
          </button>
        </div>

        {/* Plankaarten */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {PLANS.map((plan) => {
            const isCurrent     = plan.key === currentPlan && isActivePlan
            const isCurrentFree = plan.key === 'free' && !isActivePlan
            const isUpgrade     = PLAN_ORDER[plan.key] > PLAN_ORDER[currentPlan]
            const isDowngrade   = PLAN_ORDER[plan.key] < PLAN_ORDER[currentPlan] && isActivePaid  // alleen bij betaald, niet cadeau

            const chosen = plan.key !== 'free'
              ? billingInterval === 'monthly' ? plan.monthly! : plan.yearly!
              : null

            const isLoading = chosen ? loading === chosen.variant : false

            const Icon = plan.icon

            return (
              <div
                key={plan.key}
                className={cn(
                  'relative rounded-2xl border bg-card p-5 sm:p-6 space-y-5 flex flex-col',
                  (isCurrent || isCurrentFree) ? plan.border : 'border-border',
                  plan.key === 'team' && !isCurrent && 'sm:col-span-2 lg:col-span-1'
                )}
              >
                {/* Huidig plan badge */}
                {(isCurrent || isCurrentFree) && (
                  <Badge className={cn(
                    'absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap flex items-center gap-1',
                    isActiveGift && isCurrent
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : plan.badge
                  )}>
                    {isActiveGift && isCurrent && <Gift className="h-3 w-3" />}
                    {isActiveGift && isCurrent ? 'Cadeau plan' : 'Huidig plan'}
                  </Badge>
                )}

                {/* Populair badge (Team, alleen als het niet huidig plan is) */}
                {'popular' in plan && plan.popular && !isCurrent && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-500/15 text-violet-400 whitespace-nowrap">
                    Populair
                  </Badge>
                )}

                {/* Plan naam + icon */}
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg bg-muted/50 shrink-0', plan.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{plan.name}</h2>
                    {chosen && 'saving' in chosen && (chosen as { saving?: string }).saving && billingInterval === 'yearly' && (
                      <p className="text-xs text-emerald-400">
                        Bespaar {(chosen as { saving: string }).saving} per jaar
                      </p>
                    )}
                  </div>
                </div>

                {/* Prijs */}
                <div>
                  {plan.key === 'free' ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">€0</span>
                      <span className="text-sm text-muted-foreground">/ altijd gratis</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold">€{chosen!.price}</span>
                        <span className="text-sm text-muted-foreground">
                          / {billingInterval === 'monthly' ? 'per maand' : 'per jaar'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {billingInterval === 'yearly'
                          ? 'Eenmalig gefactureerd'
                          : 'Maandelijks gefactureerd'}
                      </p>
                    </>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      {plan.key === 'free'
                        ? <X className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground/50" />
                        : <Check className={cn('h-4 w-4 mt-0.5 shrink-0', plan.color)} />
                      }
                      <span className={plan.key === 'free' ? 'text-muted-foreground' : ''}>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA knop */}
                {(isCurrent || isCurrentFree) ? (
                  <Button variant="outline" disabled className="w-full">
                    <Check className="h-4 w-4 mr-2" /> Actief plan
                  </Button>
                ) : isDowngrade ? (
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground hover:text-destructive"
                    onClick={() => setShowCancelConfirm(true)}
                    disabled={cancelling || loading !== null}
                  >
                    Terugzetten naar Free
                  </Button>
                ) : isUpgrade || plan.key !== 'free' ? (
                  <Button
                    className={cn(
                      'w-full',
                      plan.key === 'team' && 'bg-violet-600 hover:bg-violet-500'
                    )}
                    disabled={isLoading || loading !== null}
                    onClick={() => chosen && handleCheckout(chosen.variant)}
                  >
                    {isLoading
                      ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Betaling voorbereiden…</>
                      : isCurrent
                        ? 'Plan verlengen'
                        : `${plan.name} activeren`
                    }
                  </Button>
                ) : null}
              </div>
            )
          })}
        </div>

        {/* Foutmelding */}
        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        {/* Plan opzeggen sectie (alleen bij betaald — niet bij cadeau) */}
        {isActivePaid && (
          <div className="rounded-xl border border-border/50 p-4 sm:p-5 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Abonnement beheren
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {hasSubscription
                  ? 'Je abonnement wordt automatisch verlengd. Je kunt op elk moment opzeggen.'
                  : 'Je plan is eenmalig betaald en wordt niet automatisch verlengd.'}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setShowCancelConfirm(true)}
                disabled={cancelling}
              >
                {cancelling
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Bezig…</>
                  : 'Plan opzeggen'}
              </Button>
            </div>
          </div>
        )}

        {/* Bevestigingsdialoog opzeggen */}
        {showCancelConfirm && (
          <>
            <div
              className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
              onClick={() => !cancelling && setShowCancelConfirm(false)}
            >
              <div
                className="bg-card border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-destructive/15 shrink-0">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Plan opzeggen?</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {hasSubscription
                        ? `Je behoudt toegang tot ${planExpiresAt
                          ? new Date(planExpiresAt).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })
                          : 'het einde van je periode'}. Daarna ga je terug naar Free.`
                        : 'Je plan wordt direct teruggezet naar Free. Dit kan niet worden teruggedraaid.'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setShowCancelConfirm(false)}
                    disabled={cancelling}
                  >
                    Annuleren
                  </Button>
                  <Button
                    variant="destructive" size="sm"
                    onClick={handleCancel}
                    disabled={cancelling}
                  >
                    {cancelling
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Bezig…</>
                      : 'Ja, opzeggen'}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Footer info */}
        <div className="text-center space-y-1 text-xs text-muted-foreground pb-4">
          <p>Betaling via Mollie · Veilig & versleuteld</p>
          <p>Elk moment opzegbaar · plan blijft actief tot einde van de betaalperiode</p>
        </div>

      </div>
    </div>
  )
}
