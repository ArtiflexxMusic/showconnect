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

  // Alle queries parallel uitvoeren voor maximale snelheid
  const [
    { data: show },
    { data: rundowns },
    { data: members },
    { data: invitations },
    { data: profile },
  ] = await Promise.all([
    supabase.from('shows').select('*').eq('id', showId).single(),
    supabase.from('rundowns')
      .select('*, cues(count)')
      .eq('show_id', showId)
      .order('created_at', { ascending: true }),
    supabase.from('show_members')
      .select('*, profile:profiles!show_members_user_id_fkey(id, email, full_name, avatar_url)')
      .eq('show_id', showId)
      .order('created_at', { ascending: true }),
    supabase.from('invitations')
      .select('*')
      .eq('show_id', showId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('role').eq('id', user.id).single(),
  ])

  if (!show) notFound()
  const isPlatformAdmin = profile?.role === 'beheerder' || profile?.role === 'admin'
  const currentMember = (members ?? []).find(m => m.user_id === user.id)

  // Niet-lid en geen platform-admin: toegang geweigerd → terug naar dashboard
  if (!isPlatformAdmin && !currentMember) {
    redirect('/dashboard')
  }

  const currentUserRole: ShowMemberRole = isPlatformAdmin ? 'owner' : (currentMember?.role ?? 'viewer')

  // Auto-redirect: presenter → presenter view, crew → crew view (alleen als er één rundown is)
  if (!isPlatformAdmin && rundowns && rundowns.length === 1) {
    const activeOrFirst = rundowns[0]
    if (currentUserRole === 'presenter') {
      redirect(`/shows/${showId}/rundown/${activeOrFirst.id}/presenter`)
    }
    if (currentUserRole === 'crew') {
      redirect(`/shows/${showId}/rundown/${activeOrFirst.id}/crew`)
    }
  }

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
