import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfilePage } from '@/components/layout/ProfilePage'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Mijn profiel – CueBoard' }

export default async function Profile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return <ProfilePage profile={profile as import('@/lib/types/database').Profile} />
}
