import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CallerView } from '@/components/rundown/CallerView'
import type { Show, Rundown, Cue } from '@/lib/types/database'

interface PageProps {
  params: Promise<{ showId: string; rundownId: string }>
}

export default async function CallerPage({ params }: PageProps) {
  const { showId, rundownId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Alle queries parallel — toegangscheck en data tegelijk ophalen
  const [
    { data: profile },
    { data: membership },
    { data: rundownData },
    { data: showData },
    { data: cues },
  ] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('show_members').select('role').eq('show_id', showId).eq('user_id', user.id).single(),
    supabase.from('rundowns').select('*').eq('id', rundownId).eq('show_id', showId).single(),
    supabase.from('shows').select('*').eq('id', showId).single(),
    supabase.from('cues').select('*').eq('rundown_id', rundownId).order('position', { ascending: true }),
  ])

  const isPlatformAdmin = profile?.role === 'beheerder' || profile?.role === 'admin'
  const allowedRoles = ['owner', 'editor', 'caller']
  if (!isPlatformAdmin && (!membership || !allowedRoles.includes(membership.role))) {
    redirect(`/shows/${showId}`)
  }

  if (!rundownData) notFound()
  if (!showData) notFound()

  return (
    <CallerView
      rundown={rundownData as Rundown}
      show={showData as Show}
      initialCues={(cues ?? []) as Cue[]}
      userId={user.id}
    />
  )
}
