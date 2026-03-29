/**
 * POST /api/push/subscribe
 *
 * Slaat een Web Push subscription op voor de ingelogde gebruiker.
 * Body: { endpoint, keys: { p256dh, auth } }
 *
 * DELETE /api/push/subscribe
 *
 * Verwijdert een bestaande subscription.
 * Body: { endpoint }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const body = await request.json()
  const { endpoint, keys } = body as {
    endpoint: string
    keys: { p256dh: string; auth: string }
  }

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Ongeldige subscription data' }, { status: 400 })
  }

  const userAgent = request.headers.get('user-agent') ?? undefined

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id:   user.id,
        endpoint,
        p256dh:    keys.p256dh,
        auth_key:  keys.auth,
        user_agent: userAgent,
      },
      { onConflict: 'user_id,endpoint' }
    )

  if (error) {
    console.error('[push/subscribe] DB fout:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { endpoint } = await request.json() as { endpoint: string }
  if (!endpoint) return NextResponse.json({ error: 'Endpoint vereist' }, { status: 400 })

  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)

  return NextResponse.json({ success: true })
}
