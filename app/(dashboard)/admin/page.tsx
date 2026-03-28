import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminPanel } from '@/components/team/AdminPanel'
import type { Metadata } from 'next'
import type { UserRole } from '@/lib/types/database'

export const metadata: Metadata = { title: 'Admin – CueBoard' }

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Alleen admins en beheerders
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin' && profile?.role !== 'beheerder') redirect('/dashboard')

  // Alle gebruikers ophalen incl. plan
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, avatar_url, created_at, plan, plan_source, plan_expires_at')
    .order('created_at', { ascending: false })

  // Alle shows (twee queries om RLS-aggregatie-issue te vermijden)
  const { data: showsRaw } = await supabase
    .from('shows')
    .select('id, name, date, created_by, created_at')
    .order('created_at', { ascending: false })

  // Ledencount per show via aparte query
  const { data: memberCounts } = await supabase
    .from('show_members')
    .select('show_id')

  const countMap: Record<string, number> = {}
  for (const m of (memberCounts ?? [])) {
    countMap[m.show_id] = (countMap[m.show_id] ?? 0) + 1
  }

  const shows = (showsRaw ?? []).map(s => ({
    ...s,
    show_members: [{ count: countMap[s.id] ?? 0 }],
  }))

  return (
    <AdminPanel
      users={users ?? []}
      shows={shows ?? []}
      currentUserRole={profile.role as UserRole}
    />
  )
}
