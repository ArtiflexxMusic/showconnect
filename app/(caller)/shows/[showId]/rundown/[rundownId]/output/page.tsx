import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { StageOutputView } from '@/components/slides/StageOutputView'
import type { Rundown, Show } from '@/lib/types/database'

interface PageProps {
  params: Promise<{ showId: string; rundownId: string }>
}

export const metadata: Metadata = {
  title: 'Stage Output – CueBoard',
}

export default async function OutputPage({ params }: PageProps) {
  const { showId, rundownId } = await params
  const supabase = await createClient()

  const [{ data: rundownRaw }, { data: showRaw }] = await Promise.all([
    supabase.from('rundowns').select('*').eq('id', rundownId).single(),
    supabase.from('shows').select('*').eq('id', showId).single(),
  ])

  if (!rundownRaw || !showRaw) return notFound()

  return (
    <StageOutputView
      rundown={rundownRaw as unknown as Rundown}
      showName={(showRaw as unknown as Show).name}
    />
  )
}
