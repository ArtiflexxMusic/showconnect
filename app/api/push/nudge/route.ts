/**
 * POST /api/push/nudge
 *
 * Stuurt een push notificatie naar alle show-leden van een rundown.
 * Bedoeld als aanvulling op de Realtime broadcast-nudge in CallerView.
 *
 * Body: { rundownId: string, message?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { APP_URL } from '@/lib/env'

export async function POST(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { rundownId, message } = await request.json() as {
    rundownId: string
    message?: string
  }

  if (!rundownId) return NextResponse.json({ error: 'rundownId vereist' }, { status: 400 })

  // Haal show-leden op die bij deze rundown horen (behalve de caller zelf)
  const { data: rundown } = await supabase
    .from('rundowns')
    .select('show_id, name')
    .eq('id', rundownId)
    .single()

  if (!rundown) return NextResponse.json({ error: 'Rundown niet gevonden' }, { status: 404 })

  const { data: members } = await supabase
    .from('show_members')
    .select('user_id')
    .eq('show_id', rundown.show_id)
    .neq('user_id', user.id)

  const userIds = (members ?? []).map((m) => m.user_id as string)
  if (!userIds.length) return NextResponse.json({ sent: 0 })

  // Roep de interne push/send API aan
  const pushUrl = `${APP_URL}/api/push/send`
  const body = message ?? '🔔 Aandacht gevraagd!'

  try {
    await fetch(pushUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userIds,
        title: `CueBoard – ${rundown.name}`,
        body,
        url: `/rundown/${rundownId}/crew`,
        tag: `nudge-${rundownId}`,
      }),
    })
  } catch {
    // Best-effort — push failure mag de broadcast niet blokkeren
  }

  return NextResponse.json({ sent: userIds.length })
}
