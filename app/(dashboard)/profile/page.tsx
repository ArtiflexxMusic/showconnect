import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfilePage } from '@/components/layout/ProfilePage'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mijn profiel – CueBoard' }

export default async function Profile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: shows }, { data: memberships }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('shows').select('id, rundowns(id, cues(id))').eq('created_by', user.id),
    supabase.from('show_members').select('show_id').eq('user_id', user.id),
  ])

  if (!profile) redirect('/login')

  const showCount   = (shows ?? []).length
  const rundownCount = (shows ?? []).reduce((acc, s) => acc + ((s.rundowns as unknown[]) ?? []).length, 0)
  const cueCount    = (shows ?? []).reduce((acc, s) =>
    acc + ((s.rundowns as Array<{cues: unknown[]}>) ?? []).reduce((a, r) => a + (r.cues?.length ?? 0), 0), 0)
  const sharedCount = (memberships ?? []).length

  return (
    <ProfilePage
      profile={profile as import('@/lib/types/database').Profile}
      stats={{ showCount, rundownCount, cueCount, sharedCount }}
    />
  )
}
