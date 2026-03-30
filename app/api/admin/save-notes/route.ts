/**
 * PATCH /api/admin/save-notes
 * Slaat admin-notities op voor een gebruiker.
 * Alleen toegankelijk voor beheerders en admins.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['beheerder', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const { userId, notes } = body ?? {}
  if (!userId) return NextResponse.json({ error: 'userId vereist' }, { status: 400 })

  const { error } = await supabase
    .from('profiles')
    .update({ admin_notes: typeof notes === 'string' ? notes.trim() || null : null })
    .eq('id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
