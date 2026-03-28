/**
 * GET /api/companion/cue?rundownId=xxx
 *
 * Geeft de actieve cuenaam terug als PLAIN TEXT — geen JSON.
 * Speciaal voor Bitfocus Companion zodat de response direct als
 * variabele bruikbaar is zonder JSON-parsing.
 *
 * Query params:
 *   field=active (default) — actieve cue
 *   field=next             — volgende cue
 *   field=rundown          — rundown naam
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
  const field = request.nextUrl.searchParams.get('field') ?? 'active'

  if (!rundownId || !UUID_RE.test(rundownId)) {
    return new NextResponse('invalid rundownId', { status: 400 })
  }

  try {
    const supabase = createServiceClient()

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
