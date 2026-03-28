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

  // Alle gebruikers ophalen
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, avatar_url, created_at')
    .order('created_at', { ascending: false })

  // Alle shows met ledencount
  const { data: shows } = await supabase
    .from('shows')
    .select('id, name, date, created_by, show_members(count)')
    .order('created_at', { ascending: false })

  return (
    <AdminPanel
      users={users ?? []}
      shows={shows ?? []}
      currentUserRole={profile.role as UserRole}
    />
  )
}
