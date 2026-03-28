import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// POST /api/companion/relay
// Server-side proxy: stuurt een request door naar Companion (lokaal HTTP).
// Hierdoor omzeilen we de browser mixed-content beperking (HTTPS → HTTP).
export async function POST(req: NextRequest) {
  // Authenticatie vereist
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { url?: string; payload?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { url, payload } = body
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 })
  }

  // Alleen lokale/private IP-adressen toestaan (veiligheid)
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }

  const hostname = parsed.hostname
  const isPrivate =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)

  if (!isPrivate) {
    return NextResponse.json({ error: 'Only local/private addresses allowed' }, { status: 400 })
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload ?? {}),
      // @ts-expect-error Node 18+ fetch signal
      signal: AbortSignal.timeout(5000),
    })
    return NextResponse.json({ status: response.status, ok: response.ok })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Connection failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
