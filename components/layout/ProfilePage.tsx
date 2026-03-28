'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, User, Shield, Check, KeyRound, LogOut } from 'lucide-react'
import type { Profile } from '@/lib/types/database'
import { useRouter } from 'next/navigation'

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
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [error, setError]             = useState('')
  const [pwSending, setPwSending]     = useState(false)
  const [pwSent, setPwSent]           = useState(false)
  const [loggingOut, setLoggingOut]   = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const { error: dbError } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() || null })
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

      {/* Naam bewerken */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weergavenaam</CardTitle>
          <CardDescription>
            Je naam is zichtbaar voor teamgenoten in gedeelde shows.
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
