import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/companion/active?token=mijn-mac
// Geeft de rundown_id terug voor dit token — geen auth nodig (Companion heeft geen login).
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return new NextResponse('missing token', { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('companion_active')
    .select('rundown_id')
    .eq('token', token)
    .single()

  if (error || !data) return new NextResponse('not found', { status: 404 })

  // Geeft plain text terug — Companion's result_stringify: true pakt dit op
  return new NextResponse(data.rundown_id, {
    headers: { 'Content-Type': 'text/plain' },
  })
}
