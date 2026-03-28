/**
 * POST /api/shows
 *
 * Maakt een nieuwe show aan met bijbehorende rundown.
 * Controleert planlimieten server-side voor aanmaken.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkPlanGate } from '@/lib/plan-gates'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  // Plan gate: tel bestaande shows
  const { count: showCount } = await supabase
    .from('show_members')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('role', 'owner')

  const gate = await checkPlanGate(user.id, 'max_shows', showCount ?? 0)
  if (!gate.allowed) {
    return NextResponse.json({ error: gate.message, upgrade: true, plan: gate.plan }, { status: 403 })
  }

  const body = await request.json()
  const { name, date, venue, description, rundownName } = body as {
    name: string
    date: string | null
    venue: string | null
    description: string | null
    rundownName: string
  }

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Naam is verplicht' }, { status: 400 })
  }

  // Show aanmaken
  const { data: show, error: showError } = await supabase
    .from('shows')
    .insert({
      name: name.trim(),
      date: date || null,
      venue: venue?.trim() || null,
      description: description?.trim() || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (showError) return NextResponse.json({ error: showError.message }, { status: 500 })

  // Owner toevoegen
  await supabase.from('show_members').insert({
    show_id: show.id,
    user_id: user.id,
    role: 'owner',
  })

  // Rundown aanmaken
  const { data: rundown, error: rundownError } = await supabase
    .from('rundowns')
    .insert({
      show_id: show.id,
      name: rundownName?.trim() || 'Hoofdrundown',
    })
    .select()
    .single()

  if (rundownError) return NextResponse.json({ error: rundownError.message }, { status: 500 })

  return NextResponse.json({ show, rundown })
}
