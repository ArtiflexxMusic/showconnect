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

  // Controleer of de gebruiker toegang heeft (owner, editor, caller of platform admin)
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isPlatformAdmin = profile?.role === 'beheerder' || profile?.role === 'admin'

  if (!isPlatformAdmin) {
    const { data: membership } = await supabase
      .from('show_members')
      .select('role')
      .eq('show_id', showId)
      .eq('user_id', user.id)
      .single()

    const allowedRoles = ['owner', 'editor', 'caller']
    if (!membership || !allowedRoles.includes(membership.role)) {
      redirect(`/shows/${showId}`)
    }
  }

  const { data: rundownData } = await supabase
    .from('rundowns')
    .select('*')
    .eq('id', rundownId)
    .eq('show_id', showId)
    .single()

  if (!rundownData) notFound()

  const { data: showData } = await supabase
    .from('shows')
    .select('*')
    .eq('id', showId)
    .single()

  if (!showData) notFound()

  const { data: cues } = await supabase
    .from('cues')
    .select('*')
    .eq('rundown_id', rundownId)
    .order('position', { ascending: true })

  return (
    <CallerView
      rundown={rundownData as Rundown}
      show={showData as Show}
      initialCues={(cues ?? []) as Cue[]}
      userId={user.id}
    />
  )
}
