import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { CastPortalView } from '@/components/cast/CastPortalView'
import type { CastMember, Show, Rundown, Cue } from '@/lib/types/database'

interface PageProps {
  params: { token: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return { title: 'Cast Portal – CueBoard' }
}

export default async function CastPortalPage({ params }: PageProps) {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: link } = await (supabase as any)
    .from('cast_portal_links')
    .select('*, cast_member:cast_members(*)')
    .eq('token', params.token)
    .single()

  if (!link) return notFound()

  const { data: show } = await supabase.from('shows').select('*').eq('id', link.show_id).single()
  if (!show) return notFound()

  const { data: rundowns } = await supabase
    .from('rundowns')
    .select('*')
    .eq('show_id', link.show_id)
    .order('created_at')

  // Fetch all cues for all rundowns
  const rundownIds = (rundowns ?? []).map((r) => r.id)
  let cues: Cue[] = []
  if (rundownIds.length > 0) {
    const { data: allCues } = await supabase
      .from('cues')
      .select('*')
      .in('rundown_id', rundownIds)
      .order('position')
    cues = (allCues ?? []) as Cue[]
  }

  return (
    <CastPortalView
      castMember={link.cast_member as CastMember | null}
      show={show as Show}
      rundowns={(rundowns ?? []) as Rundown[]}
      cues={cues}
      token={params.token}
    />
  )
}
