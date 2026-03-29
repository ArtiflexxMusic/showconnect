import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { PrintableRundown } from '@/components/rundown/PrintableRundown'
import type { Cue, Rundown } from '@/lib/types/database'

interface PageProps {
  params: Promise<{ rundownId: string }>
}

export default async function PrintRundownPage({ params }: PageProps) {
  const { rundownId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rundownRaw } = await supabase
    .from('rundowns').select('*').eq('id', rundownId).single()
  if (!rundownRaw) notFound()

  const { data: showRaw } = await supabase
    .from('shows').select('name, date, venue').eq('id', rundownRaw.show_id).single()

  const { data: cues } = await supabase
    .from('cues').select('*').eq('rundown_id', rundownId).order('position', { ascending: true })

  return (
    <PrintableRundown
      rundown={rundownRaw as unknown as Rundown}
      show={showRaw as { name: string; date: string | null; venue: string | null } ?? { name: '', date: null, venue: null }}
      cues={(cues ?? []) as unknown as Cue[]}
    />
  )
}
