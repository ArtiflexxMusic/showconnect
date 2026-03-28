'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, User, Shield, Check, KeyRound, LogOut, Phone, Zap, Users, CreditCard, AlertTriangle } from 'lucide-react'
import type { Profile } from '@/lib/types/database'
import { useRouter } from 'next/navigation'
import { PLAN_LABELS, PLAN_COLORS, isTrialActive } from '@/lib/plans'
import { cn } from '@/lib/utils'

interface ProfilePageProps {
  profile: Profile
}

function Avatar({ name, email, size = 'lg' }: { name: string | null; email: string; size?: 'sm' | 'lg' }) {
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : email[0].toUpperCase()
  const sz = size === 'lg' ? 'h-20 w-20 text-2xl' : 'h-9 w-9 text-sm'
  return (
    <div className={`${sz} rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center font-bold text-primary shrink-0`}>
      {initials}
    </div>
  )
}

const ROLE_LABELS: Record<string, string> = {
  beheerder: 'Beheerder',
  admin:     'Admin',
  crew:      'Gebruiker',
}

export function ProfilePage({ profile }: ProfilePageProps) {
  const router = useRouter()
  const supabase = createClient()

  const [fullName, setFullName]       = useState(profile.full_name ?? '')
  const [phone, setPhone]             = useState(profile.phone ?? '')
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [error, setError]             = useState('')
  const [pwSending, setPwSending]     = useState(false)
  const [pwSent, setPwSent]           = useState(false)
  const [loggingOut, setLoggingOut]   = useState(false)
  const [cancelling, setCancelling]   = useState(false)
  const [cancelDone, setCancelDone]   = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const { error: dbError } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() || null, phone: phone.trim() || null })
      .eq('id', profile.id)
    setSaving(false)
    if (dbError) {
      setError('Opslaan mislukt. Probeer opnieuw.')
    } else {
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const handlePasswordReset = async () => {
    setPwSending(true)
    await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/profile`,
    })
    setPwSending(false)
    setPwSent(true)
    setTimeout(() => setPwSent(false), 5000)
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleCancelSubscription = async () => {
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

  const isPaidPlan    = profile.plan !== 'free' && profile.plan_source === 'paid'
  const hasActiveSub  = !!profile.mollie_subscription_id
  const trialActive   = isTrialActive(profile.trial_ends_at)
  const planExpired   = profile.plan_expires_at ? new Date(profile.plan_expires_at) < new Date() : false
  const planLabel     = PLAN_LABELS[profile.plan]
  const planColor     = PLAN_COLORS[profile.plan]

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <User className="h-6 w-6" /> Mijn profiel
        </h1>
        <p className="text-muted-foreground mt-1">Beheer je accountgegevens</p>
      </div>

      {/* Avatar + basisinfo */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-5">
            <Avatar name={profile.full_name} email={profile.email} size="lg" />
            <div>
              <p className="font-semibold text-lg leading-none">{profile.full_name || profile.email}</p>
              {profile.full_name && (
                <p className="text-sm text-muted-foreground mt-1">{profile.email}</p>
              )}
              <div className="mt-2">
                <Badge variant="outline" className={profile.role === 'admin' ? 'text-primary border-primary/30' : ''}>
                  {profile.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                  {ROLE_LABELS[profile.role] ?? profile.role}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Plan & abonnement */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Abonnement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Huidig plan */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Huidig plan</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn('capitalize', planColor)}>
                {profile.plan === 'pro'  && <Zap   className="h-3 w-3 mr-1" />}
                {profile.plan === 'team' && <Users className="h-3 w-3 mr-1" />}
                {planLabel}
              </Badge>
              {trialActive && (
                <Badge variant="outline" className="text-amber-400 border-amber-400/30 text-xs">
                  Trial
                </Badge>
              )}
              {planExpired && profile.plan !== 'free' && (
                <Badge variant="outline" className="text-destructive border-destructive/30 text-xs">
                  Verlopen
                </Badge>
              )}
            </div>
          </div>

          {/* Interval */}
          {isPaidPlan && profile.plan_interval && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Factuurperiode</span>
              <span className="font-medium capitalize">
                {profile.plan_interval === 'monthly' ? 'Maandelijks' : 'Jaarlijks'}
              </span>
            </div>
          )}

          {/* Verloopdatum */}
          {profile.plan_expires_at && profile.plan !== 'free' && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {hasActiveSub ? 'Volgende verlenging' : 'Actief tot'}
              </span>
              <span className={cn('font-medium', planExpired && 'text-destructive')}>
                {new Date(profile.plan_expires_at).toLocaleDateString('nl-NL', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </span>
            </div>
          )}

          {/* Trial looptijd */}
          {trialActive && profile.trial_ends_at && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Trial eindigt</span>
              <span className="font-medium text-amber-400">
                {new Date(profile.trial_ends_at).toLocaleDateString('nl-NL', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </span>
            </div>
          )}

          {/* Acties */}
          <div className="flex flex-wrap gap-2 pt-1">
            {/* Upgrade knop – toon voor free/trial of verlopen plan */}
            {(profile.plan === 'free' || planExpired || trialActive) && (
              <Button
                size="sm"
                onClick={() => router.push('/upgrade')}
                className="gap-1.5"
              >
                <Zap className="h-3.5 w-3.5" />
                {profile.plan === 'free' ? 'Upgraden' : 'Plan vernieuwen'}
              </Button>
            )}

            {/* Abonnement beheren (upgrade naar ander plan) */}
            {isPaidPlan && !planExpired && !cancelDone && (
              <Button
                size="sm" variant="outline"
                onClick={() => router.push('/upgrade')}
                className="gap-1.5"
              >
                Plan wijzigen
              </Button>
            )}

            {/* Opzeggen */}
            {isPaidPlan && hasActiveSub && !cancelDone && (
              <Button
                size="sm" variant="ghost"
                className="gap-1.5 text-muted-foreground hover:text-destructive"
                onClick={handleCancelSubscription}
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
                  ? `${new Date(profile.plan_expires_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })}.`
                  : 'het einde van je betaalperiode.'}
              </p>
            </div>
          )}

          {cancelError && (
            <p className="text-sm text-destructive">{cancelError}</p>
          )}
        </CardContent>
      </Card>

      {/* Naam en telefoon bewerken */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Persoonlijke gegevens</CardTitle>
          <CardDescription>
            Je naam is zichtbaar voor teamgenoten in gedeelde shows. Je telefoonnummer is alleen zichtbaar voor beheerders.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="full-name">Naam</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Je volledige naam"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> Telefoonnummer
              <span className="text-muted-foreground font-normal text-xs">(optioneel)</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+31 6 12 34 56 78"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Opslaan…</> :
             saved  ? <><Check className="h-4 w-4" /> Opgeslagen!</> :
             'Opslaan'}
          </Button>
        </CardContent>
      </Card>

      {/* Wachtwoord wijzigen */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Wachtwoord</CardTitle>
          <CardDescription>
            Ontvang een reset-link op je e-mailadres om je wachtwoord te wijzigen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handlePasswordReset} disabled={pwSending || pwSent}>
            {pwSending ? <><Loader2 className="h-4 w-4 animate-spin" /> Versturen…</> :
             pwSent    ? <><Check className="h-4 w-4" /> Link verstuurd!</> :
             <><KeyRound className="h-4 w-4" /> Reset-link sturen</>}
          </Button>
          {pwSent && <p className="text-sm text-muted-foreground mt-2">Controleer je inbox op {profile.email}.</p>}
        </CardContent>
      </Card>

      {/* Accountinfo (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Accountinformatie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">E-mailadres</span>
            <span className="font-medium">{profile.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Rol</span>
            <span className="font-medium">{ROLE_LABELS[profile.role] ?? profile.role}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Lid sinds</span>
            <span className="font-medium">
              {new Date(profile.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Uitloggen */}
      <div className="pt-2 border-t border-border/50">
        <Button variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          Uitloggen
        </Button>
      </div>
    </div>
  )
}
