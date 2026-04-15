import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { Metadata } from 'next'
import { PLAN_LIMITS, type Plan } from '@/lib/plans'

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

  // Ingelogd → accepteer de uitnodiging server-side via admin client (bypasses RLS)
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Controleer of gebruiker al lid is
  const { data: existingMember } = await admin
    .from('show_members')
    .select('id')
    .eq('show_id', invitation.show_id)
    .eq('user_id', user.id)
    .single()

  if (!existingMember) {
    // ── Plan-limit check: niet toevoegen als de show-eigenaar al op z'n max zit ──
    const { data: showRow } = await admin
      .from('shows')
      .select('created_by')
      .eq('id', invitation.show_id)
      .single()

    if (showRow?.created_by) {
      const { data: ownerProfile } = await admin
        .from('profiles')
        .select('plan')
        .eq('id', showRow.created_by)
        .single()

      const ownerPlan = (ownerProfile?.plan as Plan | undefined) ?? 'free'
      const memberLimit = PLAN_LIMITS[ownerPlan].max_members_per_show

      const { count: currentCount } = await admin
        .from('show_members')
        .select('id', { count: 'exact', head: true })
        .eq('show_id', invitation.show_id)

      // Eigenaar telt soms apart, soms als member — neem brede marge
      if (currentCount !== null && currentCount >= memberLimit) {
        return (
          <div className="min-h-screen bg-background flex items-center justify-center p-6">
            <div className="text-center max-w-sm">
              <p className="text-4xl mb-4">🚫</p>
              <h1 className="text-xl font-semibold mb-2">Show is vol</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Het team voor deze show heeft het maximum aantal leden bereikt voor het huidige plan ({memberLimit} leden).
                Vraag de organisator om z&apos;n plan te upgraden of contact op te nemen.
              </p>
              <Button asChild><Link href="/dashboard">Naar dashboard</Link></Button>
            </div>
          </div>
        )
      }
    }

    // Lid toevoegen (service role bypasses RLS)
    const { error: insertError } = await admin.from('show_members').insert({
      show_id:    invitation.show_id,
      user_id:    user.id,
      role:       invitation.role,
      invited_by: invitation.invited_by,
    })

    if (insertError) {
      console.error('[invite] show_members insert failed:', insertError.message)
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <p className="text-4xl mb-4">⚠️</p>
            <h1 className="text-xl font-semibold mb-2">Toevoegen mislukt</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Je kon niet als lid worden toegevoegd aan deze show. Vraag de organisator om de uitnodiging opnieuw te sturen of neem contact op met support.
            </p>
            <Button asChild><Link href="/dashboard">Naar dashboard</Link></Button>
          </div>
        </div>
      )
    }

    // Uitnodiging pas markeren als geaccepteerd nadat insert geslaagd is
    await admin.from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)
  }

  redirect(`/shows/${invitation.show_id}`)
}
