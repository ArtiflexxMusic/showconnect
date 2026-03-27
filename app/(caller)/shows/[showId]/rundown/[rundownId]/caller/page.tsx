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
