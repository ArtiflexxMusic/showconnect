import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CallerView } from '@/components/rundown/CallerView'
import type { Show, Rundown, Cue } from '@/lib/types/database'
import type { Metadata } from 'next'
import { cache } from 'react'

interface PageProps {
  params: Promise<{ showId: string; rundownId: string }>
}

const loadCallerPage = cache(async (showId: string, rundownId: string) => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const [
    { data: profile },
    { data: membership },
    { data: rundownData },
    { data: showData },
    { data: cues },
  ] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('show_members').select('role').eq('show_id', showId).eq('user_id', user.id).single(),
    supabase.from('rundowns').select('*').eq('id', rundownId).eq('show_id', showId).single(),
    supabase.from('shows').select('*').eq('id', showId).single(),
    supabase.from('cues').select('*').eq('rundown_id', rundownId).order('position', { ascending: true }),
  ])
  return { user, profile, membership, rundownData, showData, cues }
})

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { showId, rundownId } = await params
  const data = await loadCallerPage(showId, rundownId)
  const rundownName = (data?.rundownData as { name?: string } | null)?.name ?? 'Caller'
  const showName    = (data?.showData    as { name?: string } | null)?.name ?? ''
  return {
    title: `🎙 Caller — ${rundownName}${showName ? ` | ${showName}` : ''} — CueBoard`,
  }
}

export default async function CallerPage({ params }: PageProps) {
  const { showId, rundownId } = await params
  const data = await loadCallerPage(showId, rundownId)
  if (!data) redirect('/login')
  const { user, profile, membership, rundownData, showData, cues } = data

  const isPlatformAdmin = profile?.role === 'beheerder' || profile?.role === 'admin'
  const allowedRoles = ['owner', 'editor', 'caller']
  if (!isPlatformAdmin && (!membership || !allowedRoles.includes(membership.role))) {
    redirect(`/shows/${showId}`)
  }

  if (!rundownData) notFound()
  if (!showData) notFound()

  return (
    <CallerView
      rundown={rundownData as Rundown}
      show={showData as Show}
      initialCues={(cues ?? []) as Cue[]}
      userId={user.id}
    />
  )
}
