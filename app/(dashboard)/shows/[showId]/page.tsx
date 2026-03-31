import type { Metadata } from 'next'
import { cache } from 'react'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCachedUser } from '@/lib/supabase/get-user'
import { ShowDashboard } from '@/components/dashboard/ShowDashboard'
import type { Show, ShowMemberRole } from '@/lib/types/database'

interface PageProps {
  params: Promise<{ showId: string }>
}

// Gedeelde data-fetch — React.cache() zorgt dat generateMetadata
// en de page component exact dezelfde Promise delen (één roundtrip).
const loadShowPage = cache(async (showId: string) => {
  const supabase = await createClient()

  // getCachedUser() is gratis als layout hem al heeft aangeroepen
  const user = await getCachedUser()
  if (!user) return null

  // Alleen kritieke queries parallel — members/invitations laden client-side
  // als de gebruiker het Team-panel opent. Scheelt de zware profile-JOIN bij elke pageload.
  const [
    { data: show },
    { data: rundowns },
    { data: membership },
    { data: profile },
  ] = await Promise.all([
    supabase.from('shows').select('*').eq('id', showId).single(),
    supabase.from('rundowns')
      .select('*, cues(count)')
      .eq('show_id', showId)
      .order('created_at', { ascending: true }),
    supabase.from('show_members')
      .select('role')
      .eq('show_id', showId)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase.from('profiles').select('role').eq('id', user.id).single(),
  ])

  return { user, show, rundowns, membership, profile }
})


export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { showId } = await params
  const data = await loadShowPage(showId)
  const name = (data?.show as { name?: string } | null)?.name
  return { title: name ? `${name} – CueBoard` : 'Show' }
}

export default async function ShowPage({ params }: PageProps) {
  const { showId } = await params
  const data = await loadShowPage(showId)

  if (!data?.user) redirect('/login')
  if (!data.show) notFound()

  const { user, show, rundowns, membership, profile } = data

  const isPlatformAdmin = profile?.role === 'beheerder' || profile?.role === 'admin'

  if (!isPlatformAdmin && !membership) redirect('/dashboard')

  const currentUserRole: ShowMemberRole = isPlatformAdmin ? 'owner' : ((membership?.role ?? 'viewer') as ShowMemberRole)

  // Auto-redirect: presenter → presenter view, crew → crew view (alleen als er één rundown is)
  if (!isPlatformAdmin && rundowns && rundowns.length === 1) {
    const activeOrFirst = rundowns[0]
    if (currentUserRole === 'presenter') redirect(`/shows/${showId}/rundown/${activeOrFirst.id}/presenter`)
    if (currentUserRole === 'crew') redirect(`/shows/${showId}/rundown/${activeOrFirst.id}/crew`)
  }

  return (
    <ShowDashboard
      show={show as Show}
      rundowns={(rundowns ?? []) as unknown as Array<{
        id: string
        name: string
        show_start_time: string | null
        created_at: string
        cues: { count: number }[]
      }>}
      currentUserRole={currentUserRole}
    />
  )
}
