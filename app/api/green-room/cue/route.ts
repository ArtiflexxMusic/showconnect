/**
 * PATCH /api/green-room/cue
 *
 * Staat Green Room gasten (zonder account) toe om cue-velden bij te werken.
 * Geautoriseerd via een cast portal token — geen Supabase auth vereist.
 * Controleert de `edit_cues` permissie van het gekoppelde cast member.
 *
 * Body: { token: string, cueId: string, title?: string, location?: string }
 * Alleen title en location mogen gewijzigd worden.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit, getIp } from '@/lib/rate-limit'

interface GreenRoomPermissions {
  view_all_cues:   boolean
  edit_cues:       boolean
  view_tech_notes: boolean
  view_countdown:  boolean
}

const DEFAULT_PERMISSIONS: GreenRoomPermissions = {
  view_all_cues:   true,
  edit_cues:       true,
  view_tech_notes: false,
  view_countdown:  true,
}

export async function PATCH(req: NextRequest) {
  // Rate limiting: max 30 updates per minuut per IP (genoeg voor normaal gebruik)
  const ip = getIp(req)
  const rl = rateLimit(`green-room-cue:${ip}`, { limit: 30, windowMs: 60_000 })
  if (!rl.success) {
    return NextResponse.json({ error: 'Te veel verzoeken, even wachten' }, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
    })
  }

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

    if (!title && location === undefined) {
      return NextResponse.json({ error: 'Geen velden om te updaten' }, { status: 400 })
    }

    const supabase = await createClient()

    // Haal de cast portal link op via token, inclusief cast member permissies
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: link } = await (supabase as any)
      .from('cast_portal_links')
      .select('show_id, cast_member:cast_members(permissions)')
      .eq('token', token)
      .single()

    if (!link) {
      return NextResponse.json({ error: 'Ongeldig Green Room token' }, { status: 403 })
    }

    // Controleer edit_cues permissie
    const memberPerms: GreenRoomPermissions = {
      ...DEFAULT_PERMISSIONS,
      ...(link.cast_member?.permissions ?? {}),
    }

    if (!memberPerms.edit_cues) {
      return NextResponse.json({ error: 'Geen bewerkrechten voor deze gast' }, { status: 403 })
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
    if (title !== undefined) updates.title = title.trim() || (cue as { title: string }).title
    if (location !== undefined) updates.location = location?.trim() || null

    // Update via service role (omzeilt RLS) — gebruik server-side supabase client
    const { error: updateError } = await supabase
      .from('cues')
      .update(updates)
      .eq('id', cueId)

    if (updateError) {
      console.error('Green Room cue update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Green Room cue API error:', err)
    return NextResponse.json({ error: 'Onbekende fout' }, { status: 500 })
  }
}
