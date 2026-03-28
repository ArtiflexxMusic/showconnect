/**
 * DELETE /api/admin/delete-user
 *
 * Verwijdert een gebruiker volledig uit Supabase Auth + profiles.
 * Alleen toegankelijk voor beheerders.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function DELETE(request: NextRequest) {
  // Verifieer dat de aanvrager een beheerder is
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'beheerder') {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }

  const { userId } = await request.json()
  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'Ongeldig userId' }, { status: 400 })
  }

  // Mag zichzelf niet verwijderen
  if (userId === user.id) {
    return NextResponse.json({ error: 'Je kunt jezelf niet verwijderen' }, { status: 400 })
  }

  // Verwijder via admin API — cascades naar profiles via FK
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
