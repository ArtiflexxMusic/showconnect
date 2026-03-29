import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PublicShowPage } from '@/components/public/PublicShowPage'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ showId: string }>
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { showId } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('shows').select('name, venue, date').eq('id', showId).single()
  if (!data) return { title: 'Show — CueBoard' }
  const d = data as { name: string; venue?: string; date?: string }
  return {
    title: `${d.name} — CueBoard`,
    description: d.venue ? `${d.name} · ${d.venue}` : d.name,
  }
}

export default async function PublicShowRoute({ params }: PageProps) {
  const { showId } = await params
  const supabase = await createClient()

  const { data: show } = await supabase
    .from('shows')
    .select('id, name, date, venue, description')
    .eq('id', showId)
    .single()

  if (!show) return notFound()

  const { data: rundowns } = await supabase
    .from('rundowns')
    .select('id, name, show_start_time, is_active')
    .eq('show_id', showId)
    .order('created_at', { ascending: true })

  return (
    <PublicShowPage
      show={show as { id: string; name: string; date: string | null; venue: string | null; description: string | null }}
      rundowns={(rundowns ?? []) as Array<{ id: string; name: string; show_start_time: string | null; is_active: boolean }>}
    />
  )
}
