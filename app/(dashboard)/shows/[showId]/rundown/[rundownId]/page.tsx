import type { Metadata } from 'next'
import { cache } from 'react'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RundownEditor } from '@/components/rundown/RundownEditor'
import { getPlanLimits } from '@/lib/plans'
import type { Show, Rundown, Cue } from '@/lib/types/database'
import type { Plan } from '@/lib/plans'

interface PageProps {
  params: Promise<{ showId: string; rundownId: string }>
}

// React.cache() deduplicates within a single request —
// generateMetadata en de page component delen zo exact dezelfde data
// zonder dat er twee keer queries worden uitgestuurd.
const loadRundownPage = cache(async (showId: string, rundownId: string) => {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Alle queries parallel — geen waterfall meer
  const [
    { data: rundown },
    { data: show },
    { data: cues },
    { data: allRundowns },
    { data: profile },
  ] = await Promise.all([
    supabase.from('rundowns').select('*').eq('id', rundownId).eq('show_id', showId).single(),
    supabase.from('shows').select('*').eq('id', showId).single(),
    supabase.from('cues').select('*').eq('rundown_id', rundownId).order('position', { ascending: true }),
    supabase.from('rundowns').select('id, name').eq('show_id', showId).order('created_at', { ascending: true }),
    supabase.from('profiles').select('plan, plan_expires_at, trial_ends_at').eq('id', user.id).single(),
  ])

  return { user, rundown, show, cues, allRundowns, profile }
})

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { showId, rundownId } = await params
  const data = await loadRundownPage(showId, rundownId)
  if (!data?.rundown) return { title: 'Rundown' }
  return { title: `${(data.rundown as unknown as Rundown).name} – CueBoard` }
}

export default async function RundownPage({ params }: PageProps) {
  const { showId, rundownId } = await params
  const data = await loadRundownPage(showId, rundownId)

  if (!data?.user) redirect('/login')
  if (!data.rundown || !data.show) notFound()

  const plan = ((data.profile as { plan?: string } | null)?.plan ?? 'free') as Plan
  const limits = getPlanLimits(
    plan,
    (data.profile as { plan_expires_at?: string | null } | null)?.plan_expires_at ?? null,
    (data.profile as { trial_ends_at?: string | null } | null)?.trial_ends_at ?? null,
  )

  return (
    <RundownEditor
      rundown={data.rundown as unknown as Rundown}
      show={data.show as unknown as Show}
      initialCues={(data.cues ?? []) as Cue[]}
      userId={data.user.id}
      allRundowns={(data.allRundowns ?? []) as Array<{ id: string; name: string }>}
      maxCues={limits.max_cues_per_rundown === Infinity ? null : limits.max_cues_per_rundown}
      maxRundowns={limits.max_rundowns_per_show === Infinity ? null : limits.max_rundowns_per_show}
    />
  )
}
