'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  CreditCard, Zap, Users, AlertTriangle, CheckCircle2,
  Clock, RefreshCw, XCircle, ChevronRight, Receipt, Loader2, Download,
} from 'lucide-react'
import type { Profile } from '@/lib/types/database'
import type { MolliePayment, MollieSubscription } from '@/lib/mollie'
import { PLAN_LABELS, PLAN_COLORS, isTrialActive } from '@/lib/plans'
import { cn } from '@/lib/utils'

interface BillingPageProps {
  profile: Profile
  payments: MolliePayment[]
  subscription: MollieSubscription | null
}

function planIcon(plan: string) {
  if (plan === 'pro')  return <Zap   className="h-3.5 w-3.5 mr-1" />
  if (plan === 'team') return <Users className="h-3.5 w-3.5 mr-1" />
  return null
}

function paymentStatusIcon(status: MolliePayment['status']) {
  switch (status) {
    case 'paid':       return <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
    case 'pending':
    case 'authorized': return <Clock        className="h-4 w-4 text-amber-400 shrink-0" />
    case 'open':       return <RefreshCw    className="h-4 w-4 text-blue-400 shrink-0" />
    default:           return <XCircle      className="h-4 w-4 text-destructive/70 shrink-0" />
  }
}

function paymentStatusLabel(status: MolliePayment['status']): string {
  const map: Record<MolliePayment['status'], string> = {
    paid:       'Geslaagd',
    pending:    'In behandeling',
    authorized: 'Geautoriseerd',
    open:       'Openstaand',
    canceled:   'Geannuleerd',
    expired:    'Verlopen',
    failed:     'Mislukt',
  }
  return map[status] ?? status
}

function formatEuro(value: string): string {
  const num = parseFloat(value)
  return `€\u202F${num.toFixed(2).replace('.', ',')}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export function BillingPage({ profile, payments, subscription }: BillingPageProps) {
  const router = useRouter()
  const [cancelling, setCancelling]   = useState(false)
  const [cancelDone, setCancelDone]   = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const isPaidPlan   = profile.plan !== 'free' && profile.plan_source === 'paid'
  const hasActiveSub = !!profile.mollie_subscription_id && subscription?.status === 'active'
  const trialActive  = isTrialActive(profile.trial_ends_at)
  const planExpired  = profile.plan_expires_at ? new Date(profile.plan_expires_at) < new Date() : false
  const planLabel    = PLAN_LABELS[profile.plan]
  const planColor    = PLAN_COLORS[profile.plan]

  const daysUntilExpiry = profile.plan_expires_at
    ? Math.ceil((new Date(profile.plan_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const handleCancel = async () => {
    if (!confirm('Weet je zeker dat je je abonnement wilt opzeggen? Je plan blijft actief tot het einde van de betaalperiode.')) return
    setCancelling(true)
    setCancelError(null)
    try {
      const res  = await fetch('/api/mollie/cancel', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Opzeggen mislukt')
      setCancelDone(true)
      router.refresh()
    } catch (err: unknown) {
      setCancelError(err instanceof Error ? err.message : 'Opzeggen mislukt')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Kop */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Facturen & Abonnement</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Overzicht van je plan, betalingsstatus en factuurhistorie.
        </p>
      </div>

      {/* Huidig plan */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" /> Huidig abonnement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Plan</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn('capitalize', planColor)}>
                {planIcon(profile.plan)}
                {planLabel}
              </Badge>
              {trialActive && (
                <Badge variant="outline" className="text-amber-400 border-amber-400/30 text-xs">Trial</Badge>
              )}
              {planExpired && profile.plan !== 'free' && (
                <Badge variant="outline" className="text-destructive border-destructive/30 text-xs">Verlopen</Badge>
              )}
            </div>
          </div>

          {isPaidPlan && profile.plan_interval && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Factuurperiode</span>
              <span className="font-medium">
                {profile.plan_interval === 'monthly' ? 'Maandelijks' : 'Jaarlijks'}
              </span>
            </div>
          )}

          {profile.plan_expires_at && profile.plan !== 'free' && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {hasActiveSub ? 'Volgende verlenging' : 'Actief tot'}
              </span>
              <span className={cn('font-medium', planExpired && 'text-destructive')}>
                {formatDate(profile.plan_expires_at)}
                {!planExpired && daysUntilExpiry !== null && daysUntilExpiry <= 14 && (
                  <span className="ml-2 text-xs text-amber-400">
                    (nog {daysUntilExpiry} {daysUntilExpiry === 1 ? 'dag' : 'dagen'})
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Subscription status vanuit Mollie */}
          {subscription && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Automatische verlenging</span>
              <span className={cn(
                'font-medium capitalize',
                subscription.status === 'active' ? 'text-emerald-400' : 'text-amber-400'
              )}>
                {subscription.status === 'active' ? 'Aan' : subscription.status}
                {subscription.nextPaymentDate && subscription.status === 'active' && (
                  <span className="text-muted-foreground font-normal ml-1">
                    · {formatDate(subscription.nextPaymentDate)}
                  </span>
                )}
              </span>
            </div>
          )}

          {trialActive && profile.trial_ends_at && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Trial eindigt</span>
              <span className="font-medium text-amber-400">{formatDate(profile.trial_ends_at)}</span>
            </div>
          )}

          {/* Acties */}
          <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
            {(profile.plan === 'free' || planExpired || trialActive) && (
              <Button size="sm" onClick={() => router.push('/upgrade')} className="gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                {profile.plan === 'free' ? 'Upgraden' : 'Plan vernieuwen'}
              </Button>
            )}
            {isPaidPlan && !planExpired && !cancelDone && (
              <Button size="sm" variant="outline" onClick={() => router.push('/upgrade')} className="gap-1.5">
                Plan wijzigen <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            )}
            {isPaidPlan && hasActiveSub && !cancelDone && (
              <Button
                size="sm" variant="ghost"
                className="text-muted-foreground hover:text-destructive gap-1.5"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Opzeggen…</>
                  : 'Abonnement opzeggen'}
              </Button>
            )}
          </div>

          {cancelDone && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-300">
                Je abonnement is opgezegd. Je hebt toegang tot{' '}
                {profile.plan_expires_at
                  ? `${formatDate(profile.plan_expires_at)}.`
                  : 'het einde van je betaalperiode.'}
              </p>
            </div>
          )}
          {cancelError && <p className="text-sm text-destructive">{cancelError}</p>}
        </CardContent>
      </Card>

      {/* Betalingshistorie */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" /> Betalingshistorie
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">
                {profile.mollie_customer_id
                  ? 'Nog geen betalingen gevonden.'
                  : 'Je hebt nog geen betalingen gedaan via CueBoard.'}
              </p>
              {profile.plan === 'free' && (
                <p className="text-xs mt-1 text-muted-foreground/60">
                  Upgrade naar Pro of Team om je betalingen hier te zien.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-0 divide-y divide-border/50">
              {payments.map((p) => {
                const description = p.metadata?.plan
                  ? `CueBoard ${PLAN_LABELS[p.metadata.plan as 'pro' | 'team'] ?? p.metadata.plan} – ${p.metadata.interval === 'monthly' ? 'maandelijks' : 'jaarlijks'}`
                  : (p as { description?: string }).description ?? 'Betaling'

                return (
                  <div key={p.id} className="flex items-center gap-3 py-3 text-sm">
                    {paymentStatusIcon(p.status)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{description}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.paidAt
                          ? formatDate(p.paidAt)
                          : formatDate(p.createdAt ?? '')}
                        <span className="mx-1.5 text-muted-foreground/30">·</span>
                        {paymentStatusLabel(p.status)}
                        {p.sequenceType === 'recurring' && (
                          <span className="ml-1.5 text-muted-foreground/50">· Automatische verlenging</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <p className="font-mono font-semibold">
                        {formatEuro(p.amount.value)}
                      </p>
                      {p.status === 'paid' && (
                        <a
                          href={`/invoice/${p.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Factuur downloaden"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Factuuradres info */}
      <p className="text-xs text-muted-foreground text-center pb-4">
        Facturen worden verstuurd naar <span className="font-medium text-foreground/70">{profile.email}</span>.
        Neem contact op via de beheerder voor kopieën of correcties.
      </p>
    </div>
  )
}
