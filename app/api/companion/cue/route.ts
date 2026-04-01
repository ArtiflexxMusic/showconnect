/**
 * GET /api/companion/cue?rundownId=xxx
 *
 * Geeft de actieve cuenaam terug als PLAIN TEXT — geen JSON.
 * Speciaal voor Bitfocus Companion zodat de response direct als
 * variabele bruikbaar is zonder JSON-parsing.
 *
 * Query params:
 *   field=active (default) — actieve cue naam
 *   field=next             — volgende cue naam
 *   field=rundown          — rundown naam
 *   field=elapsed          — verstreken tijd van actieve cue (MM:SS)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit, getIp } from '@/lib/rate-limit'

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request: NextRequest) {
  const rl = rateLimit(`companion-cue:${getIp(request)}`, { limit: 120, windowMs: 60_000 })
  if (!rl.success) return new NextResponse('rate limit', { status: 429 })

  const rundownId = request.nextUrl.searchParams.get('rundownId')
  const VALID_FIELDS = ['active', 'next', 'rundown', 'elapsed'] as const
  type FieldParam = typeof VALID_FIELDS[number]
  const rawField = request.nextUrl.searchParams.get('field') ?? 'active'
  const field: FieldParam = (VALID_FIELDS as readonly string[]).includes(rawField)
    ? rawField as FieldParam
    : 'active'

  if (!rundownId || !UUID_RE.test(rundownId)) {
    return new NextResponse('invalid rundownId', { status: 400 })
  }

  try {
    const supabase = createServiceClient()

    if (field === 'elapsed') {
      const { data } = await supabase
        .from('cues').select('started_at')
        .eq('rundown_id', rundownId).eq('status', 'running')
        .single()
      if (!data?.started_at) {
        return new NextResponse('0:00', {
          headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' }
        })
      }
      const elapsedSec = Math.floor((Date.now() - new Date(data.started_at).getTime()) / 1000)
      const m = Math.floor(elapsedSec / 60)
      const s = String(elapsedSec % 60).padStart(2, '0')
      return new NextResponse(`${m}:${s}`, {
        headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' }
      })
    }

    if (field === 'rundown') {
      const { data } = await supabase
        .from('rundowns').select('name').eq('id', rundownId).single()
      return new NextResponse(data?.name ?? '', {
        headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' }
      })
    }

    if (field === 'next') {
      const { data } = await supabase
        .from('cues').select('title')
        .eq('rundown_id', rundownId).eq('status', 'pending')
        .order('position', { ascending: true }).limit(1).single()
      return new NextResponse(data?.title ?? '–', {
        headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' }
      })
    }

    // field === 'active' (default)
    const { data } = await supabase
      .from('cues').select('title')
      .eq('rundown_id', rundownId).eq('status', 'running')
      .single()
    return new NextResponse(data?.title ?? '–', {
      headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' }
    })

  } catch {
    return new NextResponse('', { status: 500 })
  }
}
