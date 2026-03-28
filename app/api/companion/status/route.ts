/**
 * GET /api/companion/status?rundownId=xxx
 *
 * Publicly readable endpoint for Bitfocus Companion to poll the current
 * active cue of a rundown.  No auth required — data is not sensitive and
 * the rundownId acts as an implicit access token.
 *
 * Companion HTTP module setup:
 *   URL:    http://[cueboard-host]/api/companion/status?rundownId=[id]
 *   Method: GET
 *   Use $(module:body_...) variables to extract fields.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, getIp } from '@/lib/rate-limit'

// Gebruik service role om RLS te omzeilen — endpoint is publiek maar
// vereist een geldig rundownId als impliciete toegangstoken
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request: NextRequest) {
  // Rate limit: Companion mag maximaal 120x/min pollen (elke 0.5s)
  const rl = rateLimit(`companion-status:${getIp(request)}`, { limit: 120, windowMs: 60_000 })
  if (!rl.success) return NextResponse.json({ error: 'Te veel verzoeken' }, { status: 429 })

  const rundownId = request.nextUrl.searchParams.get('rundownId')
  if (!rundownId || !UUID_RE.test(rundownId)) {
    return NextResponse.json({ error: 'Geldig rundownId vereist' }, { status: 400 })
  }

  try {
    const supabase = createServiceClient()

    // Rundown info
    const { data: rundown, error: rErr } = await supabase
      .from('rundowns')
      .select('id, name, show_id, is_active, show_complete')
      .eq('id', rundownId)
      .single()

    if (rErr || !rundown) {
      return NextResponse.json({ error: 'Rundown niet gevonden' }, { status: 404 })
    }

    // Active cue
    const { data: activeCue } = await supabase
      .from('cues')
      .select('id, title, type, position, notes, duration')
      .eq('rundown_id', rundownId)
      .eq('status', 'active')
      .single()

    // Next pending cue
    const { data: nextCue } = await supabase
      .from('cues')
      .select('id, title, type, position, duration')
      .eq('rundown_id', rundownId)
      .eq('status', 'pending')
      .order('position', { ascending: true })
      .limit(1)
      .single()

    // Total cues count
    const { count: totalCues } = await supabase
      .from('cues')
      .select('id', { count: 'exact', head: true })
      .eq('rundown_id', rundownId)

    // Done cues count
    const { count: doneCues } = await supabase
      .from('cues')
      .select('id', { count: 'exact', head: true })
      .eq('rundown_id', rundownId)
      .eq('status', 'done')

    const payload = {
      // Show state
      show_complete: rundown.show_complete ?? false,
      rundown_name: rundown.name,

      // Active cue (null if none)
      active_cue_title:    activeCue?.title    ?? '',
      active_cue_type:     activeCue?.type     ?? '',
      active_cue_position: activeCue?.position != null ? activeCue.position + 1 : 0,
      active_cue_notes:    activeCue?.notes    ?? '',
      active_cue_duration: activeCue?.duration ?? 0,

      // Next cue (null if none)
      next_cue_title:    nextCue?.title    ?? '',
      next_cue_type:     nextCue?.type     ?? '',
      next_cue_position: nextCue?.position != null ? nextCue.position + 1 : 0,

      // Progress
      cues_done:  doneCues  ?? 0,
      cues_total: totalCues ?? 0,
    }

    // Short cache to prevent hammering DB on high-frequency Companion polling
    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    console.error('[companion/status]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Interne fout' }, { status: 500 })
  }
}
