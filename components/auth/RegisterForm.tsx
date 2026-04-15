'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2, UserPlus } from 'lucide-react'
import Link from 'next/link'

// Vertaal ?plan= param naar de juiste checkout variant
const PLAN_TO_CHECKOUT: Record<string, string> = {
  pro:  '/checkout?variant=pro_monthly',
  team: '/checkout?variant=team_monthly',
}

interface RegisterFormProps {
  redirectTo?: string
  /** Komt van ?plan=pro of ?plan=team in de URL — stuurt na registratie door naar checkout */
  plan?: string
}

export function RegisterForm({ redirectTo, plan }: RegisterFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)

  // Bepaal waar naartoe na e-mailbevestiging:
  // - invite-redirect heeft altijd voorrang
  // - als ?plan= meegegeven: direct naar checkout
  // - anders: publieke bevestigingspagina (werkt ook als de sessie nog niet gesynced is)
  const afterConfirmPath = redirectTo ?? (plan && PLAN_TO_CHECKOUT[plan]) ?? '/email-confirmed'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(afterConfirmPath)}`,
      },
    })

    setLoading(false)

    if (error) {
      setError(
        error.message === 'User already registered'
          ? 'Dit e-mailadres is al in gebruik. Probeer in te loggen.'
          : error.message
      )
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <Card className="border-border/50 shadow-xl">
        <CardContent className="pt-8 pb-6 text-center">
          <div className="text-5xl mb-4">📬</div>
          <h2 className="text-xl font-semibold mb-2">Controleer je inbox</h2>
          <p className="text-sm text-muted-foreground mb-4">
            We hebben een bevestigingslink gestuurd naar{' '}
            <span className="font-medium text-foreground">{email}</span>.
            Klik op de link om je account te activeren.
          </p>
          {plan && PLAN_TO_CHECKOUT[plan] && (
            <p className="text-xs text-primary bg-primary/10 rounded-lg px-3 py-2 mb-3 border border-primary/20">
              Na bevestiging word je doorgestuurd naar de betaalpagina voor je gekozen plan.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Geen mail ontvangen? Controleer ook je spammap.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 shadow-xl">
      <CardHeader>
        <CardTitle>Account aanmaken</CardTitle>
        <CardDescription>
          {redirectTo?.startsWith('/invite/')
            ? 'Maak een account aan om de uitnodiging te accepteren'
            : plan === 'pro'
              ? 'Maak een account aan en ga direct aan de slag met het Team plan'
              : plan === 'team'
                ? 'Maak een account aan en ga direct aan de slag met het Business plan'
                : 'Maak een gratis CueBoard-account aan'}
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="fullName">Volledige naam</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Jan de Vries"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoFocus
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mailadres</Label>
            <Input
              id="email"
              type="email"
              placeholder="jan@voorbeeld.nl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Wachtwoord</Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimaal 8 tekens"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Account aanmaken…</>
            ) : (
              <><UserPlus className="h-4 w-4" /> Account aanmaken</>
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Al een account?{' '}
            <Link
              href={`/login${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`}
              className="text-primary hover:underline"
            >
              Inloggen
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
