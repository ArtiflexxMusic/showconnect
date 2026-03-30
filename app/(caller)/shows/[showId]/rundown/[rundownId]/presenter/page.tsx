import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PresenterView } from '@/components/rundown/PresenterView'
import type { Cue, Rundown, Show } from '@/lib/types/database'
import type { Metadata } from 'next'
import { cache } from 'react'

interface PageProps {
  params: Promise<{ showId: string; rundownId: string }>
}

const loadPresenterPage = cache(async (showId: string, rundownId: string) => {
  const supabase = await createClient()
  const [
    { data: rundownRaw },
    { data: showRaw },
    { data: cues },
  ] = await Promise.all([
    supabase.from('rundowns').select('*').eq('id', rundownId).single(),
    supabase.from('shows').select('*').eq('id', showId).single(),
    supabase.from('cues').select('*').eq('rundown_id', rundownId).order('position', { ascending: true }),
  ])
  return { rundownRaw, showRaw, cues }
})

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { showId, rundownId } = await params
  const { rundownRaw, showRaw } = await loadPresenterPage(showId, rundownId)
  const rundownName = (rundownRaw as { name?: string } | null)?.name ?? 'Presenter'
  const showName    = (showRaw    as { name?: string } | null)?.name ?? ''
  return {
    title: `🖥 Presenter — ${rundownName}${showName ? ` | ${showName}` : ''} — CueBoard`,
  }
}

export default async function PresenterPage({ params }: PageProps) {
  const { showId, rundownId } = await params
  const { rundownRaw, showRaw, cues } = await loadPresenterPage(showId, rundownId)

  if (!rundownRaw) return notFound()
  if (!showRaw)    return notFound()

  // Geen login vereist voor presenter view
  return (
    <PresenterView
      rundown={rundownRaw as unknown as Rundown}
      show={showRaw as unknown as Show}
      initialCues={(cues ?? []) as unknown as Cue[]}
    />
  )
}
