'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Zap, Users, Loader2, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Prijzen ──────────────────────────────────────────────────────────────────

const PLANS = [
  {
    key:        'pro',
    name:       'Pro',
    icon:       Zap,
    color:      'text-primary',
    border:     'border-primary/30',
    badge:      'bg-primary/15 text-primary',
    monthly:    { variant: 'pro_monthly', price: '9,95', label: 'per maand' },
    yearly:     { variant: 'pro_yearly',  price: '99,99', label: 'per jaar', saving: '€19' },
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
    key:        'team',
    name:       'Team',
    icon:       Users,
    color:      'text-violet-400',
    border:     'border-violet-500/30',
    badge:      'bg-violet-500/15 text-violet-400',
    monthly:    { variant: 'team_monthly', price: '29,99', label: 'per maand' },
    yearly:     { variant: 'team_yearly',  price: '299,99', label: 'per jaar', saving: '€60' },
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

export default function UpgradePage() {
  const router = useRouter()
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading]   = useState<string | null>(null)
  const [error, setError]       = useState<string | null>(null)

  async function handleCheckout(variantKey: string) {
    setLoading(variantKey)
    setError(null)
    try {
      const res  = await fetch('/api/mollie/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant: variantKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Checkout mislukt')
      // Doorsturen naar Mollie checkout
      window.location.href = data.url
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Er is iets misgegaan')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">

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
          <h1 className="text-3xl font-bold tracking-tight">Kies je plan</h1>
          <p className="text-muted-foreground">
            Upgrade om meer shows te beheren en geavanceerde features te gebruiken.
          </p>
        </div>

        {/* Interval toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1 w-fit">
          <button
            onClick={() => setInterval('monthly')}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
              interval === 'monthly'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Maandelijks
          </button>
          <button
            onClick={() => setInterval('yearly')}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
              interval === 'yearly'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Jaarlijks
            <span className="text-xs bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-full font-medium">
              Bespaar tot 2 maanden
            </span>
          </button>
        </div>

        {/* Plannen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {PLANS.map((plan) => {
            const chosen  = interval === 'monthly' ? plan.monthly : plan.yearly
            const Icon    = plan.icon
            const isLoading = loading === chosen.variant

            return (
              <div
                key={plan.key}
                className={cn(
                  'relative rounded-2xl border bg-card p-6 space-y-6 flex flex-col',
                  plan.popular ? plan.border : 'border-border'
                )}
              >
                {plan.popular && (
                  <Badge className={cn('absolute -top-3 left-1/2 -translate-x-1/2', plan.badge)}>
                    Populair
                  </Badge>
                )}

                {/* Plan naam + icon */}
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg bg-muted/50', plan.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{plan.name}</h2>
                    {'saving' in chosen && typeof (chosen as { saving?: string }).saving === 'string' && (
                      <p className="text-xs text-emerald-400">
                        Bespaar {(chosen as { saving: string }).saving} per jaar
                      </p>
                    )}
                  </div>
                </div>

                {/* Prijs */}
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">€{chosen.price}</span>
                    <span className="text-sm text-muted-foreground">/ {chosen.label}</span>
                  </div>
                  {interval === 'yearly' && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Eenmalig gefactureerd · automatisch verlengd
                    </p>
                  )}
                  {interval === 'monthly' && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Maandelijks gefactureerd · elk moment opzegbaar
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className={cn('h-4 w-4 mt-0.5 shrink-0', plan.color)} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  className={cn('w-full', plan.popular && 'bg-violet-600 hover:bg-violet-500')}
                  disabled={isLoading || loading !== null}
                  onClick={() => handleCheckout(chosen.variant)}
                >
                  {isLoading
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Betaling voorbereiden…</>
                    : `${plan.name} activeren`}
                </Button>
              </div>
            )
          })}
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        {/* Veiligheid / garanties */}
        <div className="text-center space-y-1 text-xs text-muted-foreground">
          <p>Betaling via Mollie – iDEAL, creditcard, SEPA en meer</p>
          <p>Elk moment opzegbaar · je plan blijft actief tot het einde van de betaalperiode</p>
        </div>

      </div>
    </div>
  )
}
