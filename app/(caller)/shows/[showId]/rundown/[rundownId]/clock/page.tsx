import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ClockView } from '@/components/rundown/ClockView'
import type { Cue, Rundown, Show } from '@/lib/types/database'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ showId: string; rundownId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { showId } = await params
  const supabase = await createClient()
  const { data: show } = await supabase.from('shows').select('name').eq('id', showId).single()
  return {
    title: `⏱ Show Clock — ${(show as { name?: string } | null)?.name ?? 'CueBoard'}`,
  }
}

export default async function ClockPage({ params }: PageProps) {
  const { showId, rundownId } = await params
  const supabase = await createClient()

  const [{ data: rundownRaw }, { data: showRaw }, { data: cues }] = await Promise.all([
    supabase.from('rundowns').select('*').eq('id', rundownId).single(),
    supabase.from('shows').select('*').eq('id', showId).single(),
    supabase.from('cues').select('*').eq('rundown_id', rundownId).order('position', { ascending: true }),
  ])

  if (!rundownRaw || !showRaw) return notFound()

  // Geen login vereist — clock is publiek toegankelijk voor backstage schermen
  return (
    <ClockView
      rundown={rundownRaw as unknown as Rundown}
      show={showRaw as unknown as Show}
      initialCues={(cues ?? []) as unknown as Cue[]}
    />
  )
}
