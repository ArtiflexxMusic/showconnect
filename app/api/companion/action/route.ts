/**
 * POST /api/companion/action
 *
 * Voert een cue-actie uit vanuit Bitfocus Companion (of andere HTTP clients)
 * zonder dat er een ingelogde gebruiker nodig is.
 *
 * Authenticatie: het rundownId (UUID) fungeert als impliciete access token —
 * moeilijk te raden, niet publiek zichtbaar.
 *
 * Body: { action: 'go' | 'back' | 'skip', rundownId: string }
 *
 * Acties:
 *   go   — zet actieve cue op 'done', start volgende pending cue
 *   back — zet actieve cue terug op 'pending', herstart de vorige 'done' cue
 *   skip — zet actieve cue op 'skipped', start volgende pending cue
 *
 * Companion setup (Generic HTTP module):
 *   Method: POST
 *   URL:    https://www.cueboard.nl/api/companion/action
 *   Body:   {"action":"go","rundownId":"<jouw-rundown-id>"}
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, getIp } from '@/lib/rate-limit'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VALID_ACTIONS = ['go', 'back', 'skip'] as const
type Action = typeof VALID_ACTIONS[number]

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(request: NextRequest) {
  // Rate limit: max 60 acties per minuut per IP (ruim genoeg voor live gebruik)
  const rl = rateLimit(`companion-action:${getIp(request)}`, { limit: 60, windowMs: 60_000 })
  if (!rl.success) {
    return NextResponse.json({ error: 'Te veel verzoeken' }, { status: 429 })
  }

  let body: { action?: string; rundownId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldige JSON' }, { status: 400 })
  }

  const { action, rundownId } = body

  if (!rundownId || !UUID_RE.test(rundownId)) {
    return NextResponse.json({ error: 'Geldig rundownId vereist' }, { status: 400 })
  }
  if (!action || !(VALID_ACTIONS as readonly string[]).includes(action)) {
    return NextResponse.json({ error: `Actie moet 'go', 'back' of 'skip' zijn` }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Controleer of rundown bestaat
  const { data: rundown } = await supabase
    .from('rundowns')
    .select('id')
    .eq('id', rundownId)
    .single()

  if (!rundown) {
    return NextResponse.json({ error: 'Rundown niet gevonden' }, { status: 404 })
  }

  // Haal alle relevante cues op gesorteerd op positie
  const { data: cues, error: cuesError } = await supabase
    .from('cues')
    .select('id, position, status, title')
    .eq('rundown_id', rundownId)
    .order('position', { ascending: true })

  if (cuesError || !cues) {
    return NextResponse.json({ error: 'Cues ophalen mislukt' }, { status: 500 })
  }

  const activeCue = cues.find(c => c.status === 'running') ?? null
  const nextCue   = cues.find(c => c.status === 'pending' &&
    (activeCue ? c.position > activeCue.position : true)
  ) ?? null
  const prevDone  = [...cues]
    .filter(c => c.status === 'done')
    .sort((a, b) => b.position - a.position)[0] ?? null

  const now = new Date().toISOString()

  try {
    if (action === 'go' as Action) {
      // Actieve cue afronden
      if (activeCue) {
        const { error: e1 } = await supabase
          .from('cues')
          .update({ status: 'done' })
          .eq('id', activeCue.id)
          .eq('status', 'running') // race-condition bescherming
        if (e1) {
          console.error('[companion/action] go: done update failed', e1)
          return NextResponse.json({ error: 'Cue afronden mislukt' }, { status: 500 })
        }
      }
      // Volgende cue starten
      if (nextCue) {
        const { error: e2 } = await supabase
          .from('cues')
          .update({ status: 'running', started_at: now })
          .eq('id', nextCue.id)
          .eq('status', 'pending')
        if (e2) {
          console.error('[companion/action] go: running update failed', e2)
          return NextResponse.json({ error: 'Volgende cue starten mislukt' }, { status: 500 })
        }
      }
      return NextResponse.json({
        ok: true,
        action: 'go',
        finished: activeCue?.title ?? null,
        started:  nextCue?.title ?? null,
      }, { headers: { 'Access-Control-Allow-Origin': '*' } })
    }

    if (action === 'back' as Action) {
      // Actieve cue terugzetten naar pending
      if (activeCue) {
        const { error: e1 } = await supabase
          .from('cues')
          .update({ status: 'pending', started_at: null })
          .eq('id', activeCue.id)
        if (e1) {
          console.error('[companion/action] back: pending update failed', e1)
          return NextResponse.json({ error: 'Cue terugzetten mislukt' }, { status: 500 })
        }
      }
      // Vorige 'done' cue opnieuw starten
      if (prevDone) {
        const { error: e2 } = await supabase
          .from('cues')
          .update({ status: 'running', started_at: now })
          .eq('id', prevDone.id)
        if (e2) {
          console.error('[companion/action] back: running update failed', e2)
          return NextResponse.json({ error: 'Vorige cue herstarten mislukt' }, { status: 500 })
        }
      }
      return NextResponse.json({
        ok: true,
        action: 'back',
        rewound: activeCue?.title ?? null,
        restarted: prevDone?.title ?? null,
      }, { headers: { 'Access-Control-Allow-Origin': '*' } })
    }

    if (action === 'skip' as Action) {
      if (!activeCue) {
        return NextResponse.json({ error: 'Geen actieve cue om te skippen' }, { status: 409 })
      }
      const { error: e1 } = await supabase
        .from('cues')
        .update({ status: 'skipped' })
        .eq('id', activeCue.id)
      if (e1) {
        console.error('[companion/action] skip: skipped update failed', e1)
        return NextResponse.json({ error: 'Cue skippen mislukt' }, { status: 500 })
      }
      if (nextCue) {
        const { error: e2 } = await supabase
          .from('cues')
          .update({ status: 'running', started_at: now })
          .eq('id', nextCue.id)
        if (e2) {
          console.error('[companion/action] skip: running update failed', e2)
          return NextResponse.json({ error: 'Volgende cue starten mislukt' }, { status: 500 })
        }
      }
      return NextResponse.json({
        ok: true,
        action: 'skip',
        skipped: activeCue.title,
        started: nextCue?.title ?? null,
      }, { headers: { 'Access-Control-Allow-Origin': '*' } })
    }

    return NextResponse.json({ error: 'Onbekende actie' }, { status: 400 })
  } catch (err) {
    console.error('[companion/action]', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Interne fout' }, { status: 500 })
  }
}

// Preflight voor CORS (Companion stuurt soms OPTIONS)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
