import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// POST /api/companion/activate
// Slaat {token, rundownId} op in de DB zodat Companion het kan ophalen.
// Werkt altijd — zelfde origin als CueBoard, geen CORS/PNA issues.
export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { token?: string; rundownId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { token, rundownId } = body
  if (!token || !rundownId) return NextResponse.json({ error: 'Missing token or rundownId' }, { status: 400 })

  const { error } = await supabase
    .from('companion_active')
    .upsert({ token, rundown_id: rundownId, user_id: user.id, updated_at: new Date().toISOString() })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
