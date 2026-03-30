import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { CrewView } from '@/components/rundown/CrewView'
import type { Cue, Rundown, Show } from '@/lib/types/database'
import type { Metadata } from 'next'
import { cache } from 'react'

interface PageProps {
  params: Promise<{ showId: string; rundownId: string }>
}

// Cache de fetch zodat generateMetadata en de pagina dezelfde data delen
const loadCrewPage = cache(async (showId: string, rundownId: string) => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const [
    { data: profile },
    { data: membership },
    { data: rundownRaw },
    { data: showRaw },
    { data: cues },
  ] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('show_members').select('role').eq('show_id', showId).eq('user_id', user.id).single(),
    supabase.from('rundowns').select('*').eq('id', rundownId).single(),
    supabase.from('shows').select('*').eq('id', showId).single(),
    supabase.from('cues').select('*').eq('rundown_id', rundownId).order('position', { ascending: true }),
  ])
  return { user, profile, membership, rundownRaw, showRaw, cues }
})

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { showId, rundownId } = await params
  const data = await loadCrewPage(showId, rundownId)
  const rundownName = (data?.rundownRaw as { name?: string } | null)?.name ?? 'Crew'
  const showName    = (data?.showRaw    as { name?: string } | null)?.name ?? ''
  return {
    title: `📱 Crew — ${rundownName}${showName ? ` | ${showName}` : ''} — CueBoard`,
  }
}

export default async function CrewPage({ params }: PageProps) {
  const { showId, rundownId } = await params
  const data = await loadCrewPage(showId, rundownId)
  if (!data) redirect('/login')
  const { profile, membership, rundownRaw, showRaw, cues } = data

  const isPlatformAdmin = profile?.role === 'beheerder' || profile?.role === 'admin'
  const allowedRoles = ['owner', 'editor', 'caller', 'crew']
  if (!isPlatformAdmin && (!membership || !allowedRoles.includes(membership.role))) {
    redirect(`/shows/${showId}`)
  }

  if (!rundownRaw) return notFound()
  if (!showRaw)    return notFound()

  return (
    <CrewView
      rundown={rundownRaw as unknown as Rundown}
      show={showRaw as unknown as Show}
      initialCues={(cues ?? []) as unknown as Cue[]}
    />
  )
}
