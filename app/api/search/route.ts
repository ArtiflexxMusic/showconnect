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

  // Shows zoeken (eigen + gedeeld)
  const { data: shows } = await supabase
    .from('shows')
    .select('id, name, date, venue, created_by')
    .or(`created_by.eq.${user.id}${showIds.length > 0 ? `,id.in.(${showIds.join(',')})` : ''}`)
    .ilike('name', qLower)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(5)

  // Rundowns zoeken — via shows die de gebruiker mag zien
  const allShowIds = [
    ...(shows ?? []).map(s => s.id),
    ...showIds,
    // ook eigen shows die buiten de top 5 vallen
  ]
  const uniqueShowIds = [...new Set([user.id, ...allShowIds])]

  let rundowns: { id: string; name: string; show_id: string; show_name: string }[] = []

  if (uniqueShowIds.length > 0) {
    // Haal eerst alle show-ids op die de gebruiker mag zien
    const { data: accessibleShows } = await supabase
      .from('shows')
      .select('id, name')
      .or(`created_by.eq.${user.id}${showIds.length > 0 ? `,id.in.(${showIds.join(',')})` : ''}`)
      .is('archived_at', null)

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
  }

  return NextResponse.json({
    shows: shows ?? [],
    rundowns,
  })
}
