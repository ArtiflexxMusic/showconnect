import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ShowDashboard } from '@/components/dashboard/ShowDashboard'
import type { Show } from '@/lib/types/database'

interface PageProps {
  params: Promise<{ showId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { showId } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('shows').select('name').eq('id', showId).single()
  const name = (data as { name?: string } | null)?.name
  return { title: name ? `${name} – CueBoard` : 'Show' }
}

export default async function ShowPage({ params }: PageProps) {
  const { showId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: show } = await supabase
    .from('shows')
    .select('*')
    .eq('id', showId)
    .single()

  if (!show) notFound()

  const { data: rundowns } = await supabase
    .from('rundowns')
    .select('*, cues(count)')
    .eq('show_id', showId)
    .order('created_at', { ascending: true })

  return (
    <ShowDashboard
      show={show as Show}
      rundowns={(rundowns ?? []) as unknown as Array<{
        id: string
        name: string
        show_start_time: string | null
        created_at: string
        cues: { count: number }[]
      }>}
    />
  )
}
