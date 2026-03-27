import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CrewView } from '@/components/rundown/CrewView'
import type { Cue, Rundown, Show } from '@/lib/types/database'

interface PageProps {
  params: Promise<{ showId: string; rundownId: string }>
}

export default async function CrewPage({ params }: PageProps) {
  const { showId, rundownId } = await params
  const supabase = await createClient()

  const { data: rundownRaw } = await supabase
    .from('rundowns')
    .select('*')
    .eq('id', rundownId)
    .single()

  if (!rundownRaw) return notFound()

  const { data: showRaw } = await supabase
    .from('shows')
    .select('*')
    .eq('id', showId)
    .single()

  if (!showRaw) return notFound()

  const { data: cues } = await supabase
    .from('cues')
    .select('*')
    .eq('rundown_id', rundownId)
    .order('position', { ascending: true })

  return (
    <CrewView
      rundown={rundownRaw as unknown as Rundown}
      show={showRaw as unknown as Show}
      initialCues={(cues ?? []) as unknown as Cue[]}
    />
  )
}
