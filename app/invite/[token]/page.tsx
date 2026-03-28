import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Uitnodiging – CueBoard' }

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params
  const supabase = await createClient()

  // Haal de uitnodiging op (zonder auth – token is publiek)
  const { data: invitation } = await supabase
    .from('invitations')
    .select('*, shows(name, date)')
    .eq('token', token)
    .single()

  if (!invitation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">🔗</p>
          <h1 className="text-xl font-semibold mb-2">Uitnodiging niet gevonden</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Deze link is ongeldig of verlopen.
          </p>
          <Button asChild><Link href="/dashboard">Naar dashboard</Link></Button>
        </div>
      </div>
    )
  }

  const isExpired = new Date(invitation.expires_at) < new Date()
  const isAccepted = !!invitation.accepted_at

  if (isExpired || isAccepted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">{isAccepted ? '✅' : '⏰'}</p>
          <h1 className="text-xl font-semibold mb-2">
            {isAccepted ? 'Uitnodiging al geaccepteerd' : 'Uitnodiging verlopen'}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {isAccepted
              ? 'Je bent al lid van deze show.'
              : 'Vraag de organisator om een nieuwe uitnodiging.'}
          </p>
          <Button asChild><Link href="/dashboard">Naar dashboard</Link></Button>
        </div>
      </div>
    )
  }

  // Check of gebruiker is ingelogd
  const { data: { user } } = await supabase.auth.getUser()

  const showName = (invitation.shows as { name: string; date: string | null } | null)?.name ?? 'een show'
  const roleLabels: Record<string, string> = {
    owner:     'Eigenaar — volledige controle',
    editor:    'Editor — kan rundowns bewerken',
    caller:    'Caller — heeft toegang tot de caller-view',
    crew:      'Crew — crew-view met technische notities',
    presenter: 'Presenter — ziet eigen cues en volgorde',
    viewer:    'Toeschouwer — kan meekijken',
  }

  if (!user) {
    // Niet ingelogd → stuur naar login met redirect
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="inline-flex items-center gap-2 mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cueboard-logo.svg" alt="CueBoard" className="h-9 w-auto" />
          </div>
          <div>
            <h1 className="text-xl font-semibold mb-1">Je bent uitgenodigd</h1>
            <p className="text-sm text-muted-foreground">
              voor <span className="font-medium text-foreground">{showName}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">{roleLabels[invitation.role] ?? invitation.role}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link href={`/login?redirect=/invite/${token}`}>Inloggen en accepteren</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/register?redirect=/invite/${token}`}>Account aanmaken</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Ingelogd → accepteer de uitnodiging server-side
  // Controleer of gebruiker al lid is
  const { data: existingMember } = await supabase
    .from('show_members')
    .select('id')
    .eq('show_id', invitation.show_id)
    .eq('user_id', user.id)
    .single()

  if (!existingMember) {
    // Lid toevoegen
    await supabase.from('show_members').insert({
      show_id:    invitation.show_id,
      user_id:    user.id,
      role:       invitation.role,
      invited_by: invitation.invited_by,
    })
    // Uitnodiging markeren als geaccepteerd
    await supabase.from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)
  }

  redirect(`/shows/${invitation.show_id}`)
}
