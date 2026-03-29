import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RundownEditor } from '@/components/rundown/RundownEditor'
import { getPlanLimits } from '@/lib/plans'
import type { Show, Rundown, Cue } from '@/lib/types/database'
import type { Plan } from '@/lib/plans'

interface PageProps {
  params: Promise<{ showId: string; rundownId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { rundownId } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('rundowns')
    .select('name')
    .eq('id', rundownId)
    .single()

  if (!data) return { title: 'Rundown' }
  return { title: `${data.name} – CueBoard` }
}

export default async function RundownPage({ params }: PageProps) {
  const { showId, rundownId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Laad rundown
  const { data: rundownData } = await supabase
    .from('rundowns')
    .select('*')
    .eq('id', rundownId)
    .eq('show_id', showId)
    .single()

  if (!rundownData) notFound()

  // Laad show info apart
  const { data: showData } = await supabase
    .from('shows')
    .select('*')
    .eq('id', showId)
    .single()

  if (!showData) notFound()

  // Laad cues gesorteerd op positie
  const { data: cues } = await supabase
    .from('cues')
    .select('*')
    .eq('rundown_id', rundownId)
    .order('position', { ascending: true })

  // Laad alle rundowns van deze show (voor navigatie)
  const { data: allRundowns } = await supabase
    .from('rundowns')
    .select('id, name')
    .eq('show_id', showId)
    .order('created_at', { ascending: true })

  // Plan-limieten ophalen voor client-side gate
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at, trial_ends_at')
    .eq('id', user.id)
    .single()

  const plan = ((profile as { plan?: string } | null)?.plan ?? 'free') as Plan
  const limits = getPlanLimits(
    plan,
    (profile as { plan_expires_at?: string | null } | null)?.plan_expires_at ?? null,
    (profile as { trial_ends_at?: string | null } | null)?.trial_ends_at ?? null,
  )

  const rundown = rundownData as Rundown
  const show = showData as Show

  return (
    <RundownEditor
      rundown={rundown}
      show={show}
      initialCues={(cues ?? []) as Cue[]}
      userId={user.id}
      allRundowns={(allRundowns ?? []) as Array<{ id: string; name: string }>}
      maxCues={limits.max_cues_per_rundown === Infinity ? null : limits.max_cues_per_rundown}
      maxRundowns={limits.max_rundowns_per_show === Infinity ? null : limits.max_rundowns_per_show}
    />
  )
}
