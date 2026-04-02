/**
 * Callsheet printpagina — standalone route buiten (dashboard) layout
 *
 * Server component: haalt data op en geeft die door aan CallsheetPrintView (client component).
 * De client component regelt de print-knop via onClick — net als PrintableRundown.
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Cue } from '@/lib/types/database'
import CallsheetPrintView from '@/components/callsheet/CallsheetPrintView'

interface PageProps {
  params:       Promise<{ showId: string }>
  searchParams: Promise<{ d?: string }>
}

export default async function CallsheetPrintPage({ params, searchParams }: PageProps) {
  const { showId } = await params
  const { d }      = await searchParams
  const supabase   = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Decodeer callsheet-notities uit URL-param
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let notes: Record<string, any> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let crewExtras: Record<string, any> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let passedCrew: any[] = []
  if (d) {
    try {
      const parsed = JSON.parse(decodeURIComponent(d))
      notes      = parsed
      crewExtras = parsed.crew_extras ?? {}
      passedCrew = parsed.crew ?? []
    } catch { /* laat leeg */ }
  }

  const [showRes, rundownsRes, membersRes] = await Promise.all([
    supabase.from('shows').select('*').eq('id', showId).single(),
    supabase.from('rundowns')
      .select('id, name, show_start_time, notes')
      .eq('show_id', showId).order('created_at'),
    supabase.from('show_members')
      .select('id, role, profiles(full_name, email, phone)')
      .eq('show_id', showId),
  ])

  const show = showRes.data
  if (!show) redirect('/dashboard')

  const rundowns = await Promise.all(
    (rundownsRes.data ?? []).map(async (r) => {
      const { data: cues } = await supabase
        .from('cues')
        .select('id, title, type, duration_seconds, presenter, position, notes, tech_notes, location')
        .eq('rundown_id', r.id).order('position')
      return { ...r, cues: (cues ?? []) as Cue[] }
    })
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const crew = (membersRes.data ?? []).map((m: any) => {
    const extra = crewExtras[m.id] ?? {}
    const phone = extra.phone || m.profiles?.phone || passedCrew.find((c: any) => c.id === m.id)?.phone || null
    return {
      id:         m.id,
      full_name:  m.profiles?.full_name ?? null,
      email:      m.profiles?.email ?? null,
      phone,
      role:       m.role as string,
      department: extra.department || null,
      call_time:  extra.call_time  || null,
    }
  })

  const totalCues = rundowns.reduce((s, r) => s + r.cues.length, 0)
  const totalSecs = rundowns.reduce((s, r) => s + r.cues.reduce((ss, c) => ss + c.duration_seconds, 0), 0)

  const generatedAt = new Date().toLocaleString('nl-NL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <CallsheetPrintView
      show={{
        name:        show.name,
        date:        show.date ?? null,
        venue:       show.venue ?? null,
        description: show.description ?? null,
        client:      (show as { client?: string | null }).client ?? null,
      }}
      rundowns={rundowns}
      crew={crew}
      notes={notes}
      totalCues={totalCues}
      totalSecs={totalSecs}
      generatedAt={generatedAt}
    />
  )
}
