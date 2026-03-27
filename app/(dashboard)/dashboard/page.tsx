import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ShowsOverview } from '@/components/dashboard/ShowsOverview'

export const metadata: Metadata = { title: 'Dashboard – CueBoard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: shows } = await supabase
    .from('shows')
    .select('*, rundowns(id, name, is_active)')
    .order('date', { ascending: true })

  return <ShowsOverview shows={shows ?? []} />
}
