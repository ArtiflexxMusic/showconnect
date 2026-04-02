/**
 * PATCH /api/cast/cue
 *
 * Staat cast portal leden (zonder account) toe om cue-velden bij te werken.
 * Geautoriseerd via een cast portal token — geen Supabase auth vereist.
 *
 * Body: { token: string, cueId: string, title?: string, location?: string }
 * Alleen title en location mogen gewijzigd worden.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, cueId, title, location } = body as {
      token: string
      cueId: string
      title?: string
      location?: string
    }

    if (!token || !cueId) {
      return NextResponse.json({ error: 'token en cueId zijn verplicht' }, { status: 400 })
    }

    if (title === undefined && location === undefined) {
      return NextResponse.json({ error: 'Geen velden om te updaten' }, { status: 400 })
    }

    const supabase = await createClient()

    // Haal de cast portal link op via token (geen auth vereist vanwege public RLS policy)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: link } = await (supabase as any)
      .from('cast_portal_links')
      .select('show_id')
      .eq('token', token)
      .single()

    if (!link) {
      return NextResponse.json({ error: 'Ongeldig cast token' }, { status: 403 })
    }

    const showId = (link as { show_id: string }).show_id

    // Verifieer dat de cue tot deze show behoort via de rundown
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cue } = await (supabase as any)
      .from('cues')
      .select('id, title, rundown_id, rundowns!inner(show_id)')
      .eq('id', cueId)
      .single()

    if (!cue) {
      return NextResponse.json({ error: 'Cue niet gevonden' }, { status: 404 })
    }

    const cueShowId = (cue as { rundowns: { show_id: string } }).rundowns?.show_id
    if (cueShowId !== showId) {
      return NextResponse.json({ error: 'Geen toegang tot deze cue' }, { status: 403 })
    }

    // Bouw het update object — alleen toegestane velden
    const updates: Record<string, string | null> = {}
    if (title !== undefined) updates.title = title.trim() || (cue as { title: string }).title ?? ''
    if (location !== undefined) updates.location = location?.trim() || null

    // Update via service role (omzeilt RLS) — gebruik server-side supabase client
    const { error: updateError } = await supabase
      .from('cues')
      .update(updates)
      .eq('id', cueId)

    if (updateError) {
      console.error('Cast cue update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Cast cue API error:', err)
    return NextResponse.json({ error: 'Onbekende fout' }, { status: 500 })
  }
}
