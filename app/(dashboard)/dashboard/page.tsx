import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ShowsOverview } from '@/components/dashboard/ShowsOverview'
import { DashboardGuide } from '@/components/dashboard/DashboardGuide'
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist'

export const metadata: Metadata = { title: 'Dashboard – CueBoard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Haal alle shows op waar de user toegang tot heeft (via RLS)
  const { data: shows } = await supabase
    .from('shows')
    .select('*, rundowns(id, name, is_active)')
    .order('date', { ascending: true, nullsFirst: false })

  // Haal alle show_members op voor de huidige user om rol te bepalen
  const { data: memberships } = await supabase
    .from('show_members')
    .select('show_id, role')
    .eq('user_id', user.id)

  const membershipMap = new Map(
    (memberships ?? []).map((m) => [m.show_id, m.role as string])
  )

  const allShows = (shows ?? []) as Array<{
    id: string
    name: string
    date: string | null
    venue: string | null
    description: string | null
    created_by: string | null
    created_at: string
    archived_at: string | null
    rundowns: Array<{ id: string; name: string; is_active: boolean }>
  }>

  // Splits in actief vs gearchiveerd
  const activeShows   = allShows.filter((s) => !s.archived_at)
  const archivedShows = allShows.filter((s) => !!s.archived_at)

  const myShows = activeShows.filter((s) => {
    const role = membershipMap.get(s.id)
    return s.created_by === user.id || role === 'owner'
  })

  const sharedShows = activeShows.filter((s) => {
    const role = membershipMap.get(s.id)
    return s.created_by !== user.id && role !== 'owner' && role !== undefined
  })

  const myArchivedShows = archivedShows.filter((s) => {
    const role = membershipMap.get(s.id)
    return s.created_by === user.id || role === 'owner'
  })

  // Onboarding checklist data
  const hasShows       = myShows.length > 0
  const hasRundowns    = myShows.some(s => s.rundowns.length > 0)
  const hasGoneLive    = false // Kan niet server-side eenvoudig worden bepaald (cue log)
  // hasTeamMembers: true als de user op andermans shows is uitgenodigd, of memberships heeft
  const hasTeamMembers = memberships != null && memberships.length > 0

  // Toon checklist alleen voor gebruikers die nog niet alle basisstappen hebben voltooid
  const showChecklist  = !hasShows || !hasRundowns || !hasTeamMembers

  return (
    <>
      {showChecklist && (
        <OnboardingChecklist
          hasShows={hasShows}
          hasRundowns={hasRundowns}
          hasGoneLive={hasGoneLive}
          hasTeamMembers={hasTeamMembers}
        />
      )}
      <ShowsOverview
        shows={myShows}
        sharedShows={sharedShows}
        archivedShows={myArchivedShows}
        membershipMap={Object.fromEntries(membershipMap)}
      />
      <DashboardGuide hasShows={activeShows.length > 0} />
    </>
  )
}
