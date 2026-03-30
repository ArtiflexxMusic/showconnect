/**
 * PATCH /api/admin/extend-trial
 *
 * Verlengt of verwijdert de trial-periode van een gebruiker.
 * Alleen toegankelijk voor beheerders en admins.
 *
 * Body (verlengen):  { userId: string, days: number }
 * Body (verwijderen): { userId: string, remove: true }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role, admin_permissions').eq('id', user.id).single()
  if (!profile || !['beheerder', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }
  // Admins need the 'extend_trial' permission
  if (profile.role === 'admin') {
    const perms = (profile.admin_permissions as string[] | null) ?? []
    if (!perms.includes('extend_trial')) {
      return NextResponse.json({ error: 'Geen rechten voor trial-beheer' }, { status: 403 })
    }
  }

  const body = await request.json().catch(() => null)
  const { userId, days, remove } = body ?? {}

  if (!userId) return NextResponse.json({ error: 'userId is verplicht' }, { status: 400 })

  // ── Trial verwijderen ──────────────────────────────────────────────────────
  if (remove === true) {
    const { error } = await supabase
      .from('profiles')
      .update({ trial_ends_at: null })
      .eq('id', userId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, trial_ends_at: null })
  }

  // ── Trial verlengen ────────────────────────────────────────────────────────
  if (typeof days !== 'number' || days < 1 || days > 365) {
    return NextResponse.json({ error: 'Ongeldige parameters: geef days (1-365) of remove: true' }, { status: 400 })
  }

  // Haal huidige trial_ends_at op
  const { data: target } = await supabase
    .from('profiles').select('trial_ends_at').eq('id', userId).single()
  if (!target) return NextResponse.json({ error: 'Gebruiker niet gevonden' }, { status: 404 })

  // Bereken nieuwe einddatum: vanaf nu of vanaf huidige einddatum, wat later is
  const base = target.trial_ends_at && new Date(target.trial_ends_at) > new Date()
    ? new Date(target.trial_ends_at)
    : new Date()
  base.setDate(base.getDate() + days)

  const { error } = await supabase
    .from('profiles')
    .update({ trial_ends_at: base.toISOString() })
    .eq('id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, trial_ends_at: base.toISOString() })
}
