import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ShowsOverview } from '@/components/dashboard/ShowsOverview'
import { DashboardGuide } from '@/components/dashboard/DashboardGuide'

export const metadata: Metadata = { title: 'Dashboard – CueBoard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Haal alle shows op waar de user toegang tot heeft (via RLS)
  // inclusief de user's rol in die show
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

  // Splits shows op in 'mijn shows' (owner of created_by) vs 'gedeeld met mij'
  const allShows = (shows ?? []) as Array<{
    id: string
    name: string
    date: string | null
    venue: string | null
    description: string | null
    created_by: string | null
    created_at: string
    rundowns: Array<{ id: string; name: string; is_active: boolean }>
  }>

  const myShows = allShows.filter((s) => {
    const role = membershipMap.get(s.id)
    return s.created_by === user.id || role === 'owner'
  })

  const sharedShows = allShows.filter((s) => {
    const role = membershipMap.get(s.id)
    return s.created_by !== user.id && role !== 'owner' && role !== undefined
  })

  return (
    <>
      <ShowsOverview
        shows={myShows}
        sharedShows={sharedShows}
        membershipMap={Object.fromEntries(membershipMap)}
      />
      <DashboardGuide hasShows={allShows.length > 0} />
    </>
  )
}
