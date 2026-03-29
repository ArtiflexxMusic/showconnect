/**
 * GET /api/search?q=...
 *
 * Doorzoekt shows en rundowns die de ingelogde gebruiker mag zien.
 * Geeft max 5 shows + 5 rundowns terug.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) {
    return NextResponse.json({ shows: [], rundowns: [] })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const qLower = `%${q.toLowerCase()}%`

  // Shows waarbij de gebruiker lid is
  const { data: memberShowIds } = await supabase
    .from('show_members')
    .select('show_id')
    .eq('user_id', user.id)

  const showIds = (memberShowIds ?? []).map(m => m.show_id)

  // Haal alle toegankelijke shows op (eigen + gedeeld) — los opgebouwd om injectie te voorkomen
  let showsQuery = supabase
    .from('shows')
    .select('id, name, date, venue, created_by')
    .ilike('name', qLower)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(5)

  if (showIds.length > 0) {
    showsQuery = showsQuery.or(`created_by.eq.${user.id},id.in.(${showIds.join(',')})`)
  } else {
    showsQuery = showsQuery.eq('created_by', user.id)
  }

  const { data: shows } = await showsQuery

  // Haal alle toegankelijke shows op voor rundown-zoekbasis
  let accessibleQuery = supabase
    .from('shows')
    .select('id, name')
    .is('archived_at', null)

  if (showIds.length > 0) {
    accessibleQuery = accessibleQuery.or(`created_by.eq.${user.id},id.in.(${showIds.join(',')})`)
  } else {
    accessibleQuery = accessibleQuery.eq('created_by', user.id)
  }

  const { data: accessibleShows } = await accessibleQuery

  let rundowns: { id: string; name: string; show_id: string; show_name: string }[] = []

  if (accessibleShows && accessibleShows.length > 0) {
    const accessibleIds = accessibleShows.map(s => s.id)
    const showNameMap: Record<string, string> = {}
    for (const s of accessibleShows) showNameMap[s.id] = s.name

    const { data: foundRundowns } = await supabase
      .from('rundowns')
      .select('id, name, show_id')
      .in('show_id', accessibleIds)
      .ilike('name', qLower)
      .limit(5)

    rundowns = (foundRundowns ?? []).map(r => ({
      ...r,
      show_name: showNameMap[r.show_id] ?? '',
    }))
  }

  return NextResponse.json({
    shows: shows ?? [],
    rundowns,
  })
}
