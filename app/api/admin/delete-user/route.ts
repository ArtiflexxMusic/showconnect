/**
 * DELETE /api/admin/delete-user
 *
 * Verwijdert een gebruiker volledig uit Supabase Auth + profiles.
 * Alleen toegankelijk voor beheerders.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { isPlatformAdmin } from '@/lib/plans'
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from '@/lib/env'

function createAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
}

export async function DELETE(request: NextRequest) {
  // Verifieer dat de aanvrager een beheerder is
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role, admin_permissions').eq('id', user.id).single()
  if (!isPlatformAdmin(profile?.role)) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }
  // Admins need the 'delete_users' permission
  if (profile?.role === 'admin') {
    const perms = (profile.admin_permissions as string[] | null) ?? []
    if (!perms.includes('delete_users')) {
      return NextResponse.json({ error: 'Geen rechten voor gebruikers verwijderen' }, { status: 403 })
    }
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
