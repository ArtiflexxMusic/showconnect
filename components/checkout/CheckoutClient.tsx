'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft, Zap, Users, Check, Loader2, ShieldCheck, Lock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlanVariant, MollieMethod } from '@/lib/mollie'

// ─── Bekende methoden als fallback (als Mollie geen lijst geeft) ──────────────

const FALLBACK_METHODS: MollieMethod[] = [
  {
    id: 'ideal',
    description: 'iDEAL',
    image: {
      size1x: 'https://www.mollie.com/external/icons/payment-methods/ideal.png',
      size2x: 'https://www.mollie.com/external/icons/payment-methods/ideal%402x.png',
      svg:    'https://www.mollie.com/external/icons/payment-methods/ideal.svg',
    },
  },
  {
    id: 'bancontact',
    description: 'Bancontact',
    image: {
      size1x: 'https://www.mollie.com/external/icons/payment-methods/bancontact.png',
      size2x: 'https://www.mollie.com/external/icons/payment-methods/bancontact%402x.png',
      svg:    'https://www.mollie.com/external/icons/payment-methods/bancontact.svg',
    },
  },
  {
    id: 'applepay',
    description: 'Apple Pay',
    image: {
      size1x: 'https://www.mollie.com/external/icons/payment-methods/applepay.png',
      size2x: 'https://www.mollie.com/external/icons/payment-methods/applepay%402x.png',
      svg:    'https://www.mollie.com/external/icons/payment-methods/applepay.svg',
    },
  },
  {
    id: 'in3',
    description: 'IN3',
    image: {
      size1x: 'https://www.mollie.com/external/icons/payment-methods/in3.png',
      size2x: 'https://www.mollie.com/external/icons/payment-methods/in3%402x.png',
      svg:    'https://www.mollie.com/external/icons/payment-methods/in3.svg',
    },
  },
  {
    id: 'creditcard',
    description: 'Creditcard',
    image: {
      size1x: 'https://www.mollie.com/external/icons/payment-methods/creditcard.png',
      size2x: 'https://www.mollie.com/external/icons/payment-methods/creditcard%402x.png',
      svg:    'https://www.mollie.com/external/icons/payment-methods/creditcard.svg',
    },
  },
  {
    id: 'paypal',
    description: 'PayPal',
    image: {
      size1x: 'https://www.mollie.com/external/icons/payment-methods/paypal.png',
      size2x: 'https://www.mollie.com/external/icons/payment-methods/paypal%402x.png',
      svg:    'https://www.mollie.com/external/icons/payment-methods/paypal.svg',
    },
  },
  {
    id: 'directdebit',
    description: 'SEPA overboeking',
    image: {
      size1x: 'https://www.mollie.com/external/icons/payment-methods/directdebit.png',
      size2x: 'https://www.mollie.com/external/icons/payment-methods/directdebit%402x.png',
      svg:    'https://www.mollie.com/external/icons/payment-methods/directdebit.svg',
    },
  },
]

// ─── Props ────────────────────────────────────────────────────────────────────

interface CheckoutClientProps {
  variantKey: string
  variant:    PlanVariant
  methods:    MollieMethod[]
}

// ─── Plan visueel config ──────────────────────────────────────────────────────

const PLAN_STYLE = {
  pro:  { icon: Zap,   color: 'text-primary',    bg: 'bg-primary/10',    border: 'border-primary/30',    label: 'Team' },
  team: { icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30', label: 'Business' },
} as const

// ─── Component ────────────────────────────────────────────────────────────────

type BillingType = 'subscription' | 'oneoff'

// Welke methoden mogen recurring in dit Mollie-account?
// Alleen creditcard is hier betrouwbaar — iDEAL/PayPal vereisen extra activatie
// (SEPA Direct Debit voor iDEAL, billing agreements voor PayPal).
const SUBSCRIPTION_METHODS = new Set(['creditcard'])

export function CheckoutClient({ variantKey, variant, methods }: CheckoutClientProps) {
  const router = useRouter()
  const [billingType, setBillingType] = useState<BillingType>('subscription')
  const [selected, setSelected] = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const allMethods     = methods.length > 0 ? methods : FALLBACK_METHODS
  const displayMethods = billingType === 'subscription'
    ? allMethods.filter((m) => SUBSCRIPTION_METHODS.has(m.id))
    : allMethods
  const style          = PLAN_STYLE[variant.plan as 'pro' | 'team']
  const Icon           = style.icon
  const isYearly       = variant.interval === 'yearly'

  // Reset gekozen methode als die niet (meer) in de gefilterde lijst staat
  useEffect(() => {
    if (selected && !displayMethods.find((m) => m.id === selected)) {
      setSelected(null)
    }
  }, [billingType, selected, displayMethods])

  async function handlePay() {
    if (!selected) return
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/mollie/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ variant: variantKey, method: selected, billingType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Checkout mislukt')
      window.location.href = data.url
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Er is iets misgegaan')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* Terug */}
        <Button
          variant="ghost" size="sm"
          className="gap-1.5 text-muted-foreground -ml-2 mb-6 sm:mb-8"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Terug naar plannen
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-10 items-start">

          {/* ── Links: plan samenvatting ─────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            <div>
              <h1 className="text-2xl font-bold tracking-tight">Afrekenen</h1>
              <p className="text-muted-foreground text-sm mt-1">Kies hieronder hoe je wilt betalen</p>
            </div>

            {/* Plan kaart */}
            <div className={cn('rounded-2xl border p-5 space-y-4', style.border)}>
              <div className="flex items-center gap-3">
                <div className={cn('p-2.5 rounded-xl', style.bg, style.color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-base">{style.label} plan</p>
                  <p className="text-xs text-muted-foreground">
                    {isYearly ? 'Jaarabonnement' : 'Maandabonnement'}
                  </p>
                </div>
              </div>

              <div className="border-t border-border/50 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {variant.description}
                  </span>
                  <span className="font-semibold">€{variant.amount.replace('.', ',')}</span>
                </div>
                {isYearly && (
                  <div className="flex justify-between text-xs text-emerald-400">
                    <span>Jaarkorting</span>
                    <span>
                      {variant.plan === 'pro' ? 'bespaar €20' : 'bespaar €60'}
                    </span>
                  </div>
                )}
                <div className="border-t border-border/50 pt-2 flex justify-between font-semibold">
                  <span>Totaal</span>
                  <span>€{variant.amount.replace('.', ',')} EUR</span>
                </div>
              </div>
            </div>

            {/* Veiligheid */}
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                <span>Betaling verloopt veilig via Mollie</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                <span>Je gegevens worden nooit opgeslagen op onze servers</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 shrink-0" />
                <span>Elk moment opzegbaar · plan actief tot einde periode</span>
              </div>
            </div>
          </div>

          {/* ── Rechts: betaalmethode kiezer ─────────────────────────── */}
          <div className="lg:col-span-3 space-y-5">

            {/* Billing type toggle: abonnement vs eenmalig */}
            <div>
              <h2 className="text-base font-semibold mb-3">Hoe wil je betalen?</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBillingType('subscription')}
                  className={cn(
                    'rounded-xl border p-4 text-left transition-all',
                    billingType === 'subscription'
                      ? 'border-primary bg-primary/5 shadow-sm shadow-primary/20'
                      : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      'h-4 w-4 rounded-full border-2 flex items-center justify-center',
                      billingType === 'subscription' ? 'border-primary' : 'border-muted-foreground/40'
                    )}>
                      {billingType === 'subscription' && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </span>
                    <span className="text-sm font-semibold">Abonnement</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Wordt automatisch verlengd. Op elk moment opzegbaar via je account.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setBillingType('oneoff')}
                  className={cn(
                    'rounded-xl border p-4 text-left transition-all',
                    billingType === 'oneoff'
                      ? 'border-primary bg-primary/5 shadow-sm shadow-primary/20'
                      : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      'h-4 w-4 rounded-full border-2 flex items-center justify-center',
                      billingType === 'oneoff' ? 'border-primary' : 'border-muted-foreground/40'
                    )}>
                      {billingType === 'oneoff' && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </span>
                    <span className="text-sm font-semibold">Eenmalig</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Eén keer betalen, plan loopt vanzelf af. Geen automatische incasso.
                  </p>
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-base font-semibold">Kies een betaalmethode</h2>
              {billingType === 'subscription' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Abonnementen lopen via creditcard zodat we automatisch kunnen incasseren.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {displayMethods.map((method) => {
                const isSelected = selected === method.id
                return (
                  <button
                    key={method.id}
                    onClick={() => setSelected(method.id)}
                    className={cn(
                      'relative flex flex-col items-center justify-center gap-2.5 rounded-xl border p-4 transition-all duration-150 text-center group',
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm shadow-primary/20'
                        : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40'
                    )}
                  >
                    {/* Geselecteerd vinkje */}
                    {isSelected && (
                      <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-primary-foreground" />
                      </span>
                    )}

                    {/* Logo */}
                    <div className="h-9 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={method.image.svg || method.image.size2x || method.image.size1x}
                        alt={method.description}
                        width={54}
                        height={36}
                        className="object-contain max-h-9 w-auto"
                      />
                    </div>

                    {/* Naam */}
                    <span className={cn(
                      'text-xs font-medium leading-tight',
                      isSelected ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                    )}>
                      {method.description}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Foutmelding */}
            {error && (
              <p className="text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
                {error}
              </p>
            )}

            {/* Betaal-knop */}
            <Button
              size="lg"
              className={cn(
                'w-full text-base font-semibold h-12 transition-all',
                variant.plan === 'team'
                  ? 'bg-violet-600 hover:bg-violet-500'
                  : '',
                !selected && 'opacity-50 cursor-not-allowed'
              )}
              disabled={!selected || loading}
              onClick={handlePay}
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Doorsturen naar betaalpagina…</>
              ) : selected ? (
                <>
                  Betalen met {displayMethods.find(m => m.id === selected)?.description}
                  <span className="ml-2 opacity-70">→</span>
                </>
              ) : (
                'Selecteer een betaalmethode'
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Na betaling word je teruggestuurd naar CueBoard en is je plan direct actief.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
