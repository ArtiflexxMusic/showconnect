import type { Metadata } from 'next'
import { cache } from 'react'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCachedUser } from '@/lib/supabase/get-user'
import { getCachedProfile } from '@/lib/supabase/get-profile'
import { RundownEditor } from '@/components/rundown/RundownEditor'
import { getPlanLimits } from '@/lib/plans'
import type { Show, Rundown, Cue } from '@/lib/types/database'
import type { Plan } from '@/lib/plans'

interface PageProps {
  params: Promise<{ showId: string; rundownId: string }>
}

// React.cache() deduplicates within a single request: generateMetadata
// en de page component delen zo exact dezelfde data.
const loadRundownPage = cache(async (showId: string, rundownId: string) => {
  const supabase = await createClient()

  // user + profile komen uit React.cache, layout.tsx heeft ze al opgehaald
  const user = await getCachedUser()
  if (!user) return null

  // Page-specifieke queries parallel. Profile komt gratis uit de cache
  // en blokkeert de Promise.all niet.
  const [
    profile,
    { data: rundown },
    { data: show },
    { data: cues },
    { data: allRundowns },
    { data: membership },
  ] = await Promise.all([
    getCachedProfile(),
    supabase.from('rundowns').select('*').eq('id', rundownId).eq('show_id', showId).single(),
    supabase.from('shows').select('*').eq('id', showId).single(),
    supabase.from('cues').select('*').eq('rundown_id', rundownId).order('position', { ascending: true }),
    supabase.from('rundowns').select('id, name').eq('show_id', showId).order('created_at', { ascending: true }),
    supabase.from('show_members').select('role').eq('show_id', showId).eq('user_id', user.id).maybeSingle(),
  ])

  return { user, rundown, show, cues, allRundowns, profile, membership }
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

  // Crew-leden, presenters en viewers horen in de crew-view, niet de editor
  const role = (data.membership as { role?: string } | null)?.role
  const editorRoles = ['owner', 'editor', 'caller']
  if (role && !editorRoles.includes(role)) {
    redirect(`/shows/${showId}/rundown/${rundownId}/crew`)
  }

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
