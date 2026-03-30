/**
 * PATCH /api/admin/save-permissions
 *
 * Sla granulaire admin-rechten op voor een gebruiker met rol 'admin'.
 * Alleen beheerders mogen dit instellen — admins kunnen zichzelf geen rechten geven.
 *
 * Body: { userId: string, permissions: AdminPermission[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ALL_PERMISSIONS, type AdminPermission } from '@/lib/admin-permissions'

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  // Alleen beheerders kunnen admin-rechten instellen
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'beheerder') {
    return NextResponse.json({ error: 'Alleen beheerders kunnen admin-rechten instellen' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const { userId, permissions } = body ?? {}

  if (!userId) return NextResponse.json({ error: 'userId is verplicht' }, { status: 400 })
  if (!Array.isArray(permissions)) {
    return NextResponse.json({ error: 'permissions moet een array zijn' }, { status: 400 })
  }

  // Alleen bekende permissies doorlaten
  const validPermissions = (permissions as string[]).filter(
    (p): p is AdminPermission => ALL_PERMISSIONS.includes(p as AdminPermission)
  )

  // Doelgebruiker moet een admin zijn (niet beheerder — die hebben altijd alle rechten)
  const { data: target } = await supabase
    .from('profiles').select('role').eq('id', userId).single()
  if (!target) return NextResponse.json({ error: 'Gebruiker niet gevonden' }, { status: 404 })
  if (target.role !== 'admin') {
    return NextResponse.json(
      { error: 'Rechten kunnen alleen worden ingesteld voor gebruikers met rol admin' },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from('profiles')
    .update({ admin_permissions: validPermissions })
    .eq('id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, permissions: validPermissions })
}
