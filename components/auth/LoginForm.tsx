'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2, LogIn } from 'lucide-react'

type Mode = 'login' | 'signup' | 'reset'

export function LoginForm() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/dashboard')
        router.refresh()

      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) throw error
        setSuccess('Account aangemaakt! Controleer je e-mail om je account te bevestigen.')

      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        })
        if (error) throw error
        setSuccess('Wachtwoord-reset link verstuurd. Controleer je inbox.')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Er is een fout opgetreden'
      setError(
        msg === 'Invalid login credentials'
          ? 'Ongeldig e-mailadres of wachtwoord.'
          : msg === 'Email not confirmed'
          ? 'Bevestig eerst je e-mailadres.'
          : msg
      )
    } finally {
      setLoading(false)
    }
  }

  const titles: Record<Mode, string> = {
    login:  'Inloggen',
    signup: 'Account aanmaken',
    reset:  'Wachtwoord vergeten',
  }

  const descriptions: Record<Mode, string> = {
    login:  'Log in met je ShowConnect-account',
    signup: 'Maak een nieuw crew-account aan',
    reset:  'Voer je e-mail in voor een reset-link',
  }

  return (
    <Card className="border-border/50 shadow-xl">
      <CardHeader>
        <CardTitle>{titles[mode]}</CardTitle>
        <CardDescription>{descriptions[mode]}</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {/* Foutmelding */}
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Succesmelding */}
          {success && (
            <div className="rounded-md border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-400">
              {success}
            </div>
          )}

          {/* Naam veld (alleen bij signup) */}
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Volledige naam</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Jan de Vries"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          )}

          {/* E-mail */}
          <div className="space-y-2">
            <Label htmlFor="email">E-mailadres</Label>
            <Input
              id="email"
              type="email"
              placeholder="crew@showconnect.nl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          {/* Wachtwoord (niet bij reset) */}
          {mode !== 'reset' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Wachtwoord</Label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setMode('reset'); setError(null) }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Vergeten?
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                placeholder={mode === 'signup' ? 'Minimaal 8 tekens' : '••••••••'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === 'signup' ? 8 : undefined}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Even geduld...</>
            ) : mode === 'login' ? (
              <><LogIn className="h-4 w-4" /> Inloggen</>
            ) : mode === 'signup' ? (
              'Account aanmaken'
            ) : (
              'Reset-link versturen'
            )}
          </Button>

          {/* Mode wisselen */}
          <div className="text-center text-sm text-muted-foreground">
            {mode === 'login' && (
              <>
                Nog geen account?{' '}
                <button type="button" onClick={() => { setMode('signup'); setError(null) }} className="text-primary hover:underline">
                  Aanmelden
                </button>
              </>
            )}
            {mode !== 'login' && (
              <button type="button" onClick={() => { setMode('login'); setError(null) }} className="text-primary hover:underline">
                ← Terug naar inloggen
              </button>
            )}
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
