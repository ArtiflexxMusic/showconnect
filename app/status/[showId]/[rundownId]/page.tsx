import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PublicStatusView } from '@/components/rundown/PublicStatusView'
import type { Cue, Rundown, Show } from '@/lib/types/database'

interface PageProps {
  params: Promise<{ showId: string; rundownId: string }>
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PublicStatusPage({ params }: PageProps) {
  const { showId, rundownId } = await params
  // Gebruik de anonieme Supabase client (geen auth vereist)
  const supabase = await createClient()

  const { data: rundownRaw } = await supabase
    .from('rundowns')
    .select('*')
    .eq('id', rundownId)
    .eq('show_id', showId)
    .single()

  if (!rundownRaw) return notFound()

  const { data: showRaw } = await supabase
    .from('shows')
    .select('name, venue, date')
    .eq('id', showId)
    .single()

  if (!showRaw) return notFound()

  const { data: cues } = await supabase
    .from('cues')
    .select('id, position, title, type, status, duration_seconds, presenter, color')
    .eq('rundown_id', rundownId)
    .order('position', { ascending: true })

  return (
    <PublicStatusView
      rundown={rundownRaw as unknown as Rundown}
      show={showRaw as unknown as Show}
      initialCues={(cues ?? []) as unknown as Cue[]}
    />
  )
}
