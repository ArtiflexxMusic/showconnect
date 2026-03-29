/**
 * PATCH /api/admin/extend-trial
 * Verlengt de trial-periode van een gebruiker met X dagen.
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
  const { userId, days } = body ?? {}
  if (!userId || typeof days !== 'number' || days < 1 || days > 365) {
    return NextResponse.json({ error: 'Ongeldige parameters' }, { status: 400 })
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
