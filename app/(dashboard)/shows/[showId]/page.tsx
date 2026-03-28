import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ShowDashboard } from '@/components/dashboard/ShowDashboard'
import type { Show, ShowMember, Invitation, ShowMemberRole } from '@/lib/types/database'

interface PageProps {
  params: Promise<{ showId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { showId } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('shows').select('name').eq('id', showId).single()
  const name = (data as { name?: string } | null)?.name
  return { title: name ? `${name} – CueBoard` : 'Show' }
}

export default async function ShowPage({ params }: PageProps) {
  const { showId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: show } = await supabase
    .from('shows').select('*').eq('id', showId).single()
  if (!show) notFound()

  // Rundowns met cue-count
  const { data: rundowns } = await supabase
    .from('rundowns')
    .select('*, cues(count)')
    .eq('show_id', showId)
    .order('created_at', { ascending: true })

  // Leden met profiel
  const { data: members } = await supabase
    .from('show_members')
    .select('*, profile:profiles!show_members_user_id_fkey(id, email, full_name, avatar_url)')
    .eq('show_id', showId)
    .order('created_at', { ascending: true })

  // Openstaande uitnodigingen
  const { data: invitations } = await supabase
    .from('invitations')
    .select('*')
    .eq('show_id', showId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false })

  // Huidige gebruikersrol in deze show
  // Platform-beheerder en admin krijgen altijd owner-rechten zodat ze shows kunnen beheren
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isPlatformAdmin = profile?.role === 'beheerder' || profile?.role === 'admin'
  const currentMember = (members ?? []).find(m => m.user_id === user.id)
  const currentUserRole: ShowMemberRole = isPlatformAdmin ? 'owner' : (currentMember?.role ?? 'viewer')

  return (
    <ShowDashboard
      show={show as Show}
      rundowns={(rundowns ?? []) as unknown as Array<{
        id: string
        name: string
        show_start_time: string | null
        created_at: string
        cues: { count: number }[]
      }>}
      members={(members ?? []) as unknown as ShowMember[]}
      invitations={(invitations ?? []) as unknown as Invitation[]}
      currentUserRole={currentUserRole}
    />
  )
}
