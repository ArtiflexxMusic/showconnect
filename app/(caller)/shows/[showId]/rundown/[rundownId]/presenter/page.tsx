import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PresenterView } from '@/components/rundown/PresenterView'
import type { Cue, Rundown, Show } from '@/lib/types/database'

interface PageProps {
  params: Promise<{ showId: string; rundownId: string }>
}

export default async function PresenterPage({ params }: PageProps) {
  const { showId, rundownId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Rundown laden
  const { data: rundownRaw } = await supabase
    .from('rundowns')
    .select('*')
    .eq('id', rundownId)
    .single()

  if (!rundownRaw) return notFound()

  // Show laden
  const { data: showRaw } = await supabase
    .from('shows')
    .select('*')
    .eq('id', showId)
    .single()

  if (!showRaw) return notFound()

  // Cues laden
  const { data: cues } = await supabase
    .from('cues')
    .select('*')
    .eq('rundown_id', rundownId)
    .order('position', { ascending: true })

  // Geen login vereist voor presenter view (alleen PIN indien ingesteld)
  return (
    <PresenterView
      rundown={rundownRaw as unknown as Rundown}
      show={showRaw as unknown as Show}
      initialCues={(cues ?? []) as unknown as Cue[]}
    />
  )
}
