import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { CrewView } from '@/components/rundown/CrewView'
import type { Cue, Rundown, Show } from '@/lib/types/database'

interface PageProps {
  params: Promise<{ showId: string; rundownId: string }>
}

export default async function CrewPage({ params }: PageProps) {
  const { showId, rundownId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Alle queries parallel — toegangscheck en data tegelijk ophalen
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

  const isPlatformAdmin = profile?.role === 'beheerder' || profile?.role === 'admin'
  const allowedRoles = ['owner', 'editor', 'caller', 'crew']
  if (!isPlatformAdmin && (!membership || !allowedRoles.includes(membership.role))) {
    redirect(`/shows/${showId}`)
  }

  if (!rundownRaw) return notFound()
  if (!showRaw) return notFound()

  return (
    <CrewView
      rundown={rundownRaw as unknown as Rundown}
      show={showRaw as unknown as Show}
      initialCues={(cues ?? []) as unknown as Cue[]}
    />
  )
}
