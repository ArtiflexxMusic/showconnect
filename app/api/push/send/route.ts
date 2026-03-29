/**
 * POST /api/push/send
 *
 * Stuurt een Web Push notificatie naar één of meerdere gebruikers.
 * Alleen voor server-to-server gebruik (vanuit andere API routes).
 *
 * Body: { userIds: string[], title: string, body: string, url?: string, tag?: string }
 *
 * Implementatie zonder externe dependencies — gebruikt Node.js crypto + fetch.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_SERVICE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } from '@/lib/env'
import crypto from 'crypto'

// ── VAPID helpers ─────────────────────────────────────────────────────────────

function base64urlDecode(str: string): Buffer {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

function base64urlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/** Maak een VAPID JWT token voor het gegeven audience (push service origin) */
function makeVapidJwt(audience: string, privateKeyB64url: string, subject: string): string {
  const header = base64urlEncode(Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const now = Math.floor(Date.now() / 1000)
  const payload = base64urlEncode(Buffer.from(JSON.stringify({
    aud: audience,
    exp: now + 12 * 3600,
    sub: subject,
  })))

  const signingInput = `${header}.${payload}`

  // Importeer de private key vanuit raw bytes (PKCS8)
  const privKeyBytes = base64urlDecode(privateKeyB64url)
  // Maak een PKCS8 DER voor P-256
  // Header: 30 41 02 01 00 30 13 06 07 2a 86 48 ce 3d 02 01 06 08 2a 86 48 ce 3d 03 01 07 04 27 30 25 02 01 01 04 20
  const pkcs8Header = Buffer.from('304102010030130607 2a8648ce3d020106082a8648ce3d030107042730250201010420'.replace(/\s/g, ''), 'hex')
  const pkcs8 = Buffer.concat([pkcs8Header, privKeyBytes])

  const privateKey = crypto.createPrivateKey({ key: pkcs8, format: 'der', type: 'pkcs8' })
  const sig = crypto.sign('SHA256', Buffer.from(signingInput), { key: privateKey, dsaEncoding: 'ieee-p1363' })

  return `${signingInput}.${base64urlEncode(sig)}`
}

// ── Web Push Encryption (RFC 8291) ────────────────────────────────────────────

async function encryptPayload(
  payload: string,
  p256dhB64url: string,
  authB64url: string,
): Promise<{ ciphertext: Buffer; salt: Buffer; serverPublicKey: Buffer }> {
  const plaintext = Buffer.from(payload, 'utf-8')

  // Ontvanger publieke sleutel
  const recipientPubKey = base64urlDecode(p256dhB64url)
  const authSecret = base64urlDecode(authB64url)

  // Genereer ephemeral ECDH key pair voor deze push
  const { publicKey: serverPubKeyObj, privateKey: serverPrivKeyObj } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'P-256',
  })
  const serverPubDer = serverPubKeyObj.export({ type: 'spki', format: 'der' }) as Buffer
  const serverPublicKey = serverPubDer.slice(serverPubDer.length - 65)

  // Shared secret via ECDH
  const recipientKey = crypto.createPublicKey({
    key: Buffer.concat([
      Buffer.from('3059301306072a8648ce3d020106082a8648ce3d03010703420004', 'hex').slice(0, 26),
      recipientPubKey,
    ]),
    format: 'der',
    type: 'spki',
  })

  // Reconstruct spki header properly
  const spkiHeader = Buffer.from('3059301306072a8648ce3d020106082a8648ce3d030107034200', 'hex')
  const recipientSpki = Buffer.concat([spkiHeader, recipientPubKey])
  const recipientPublicKey = crypto.createPublicKey({ key: recipientSpki, format: 'der', type: 'spki' })

  const sharedSecret = crypto.diffieHellman({
    privateKey: serverPrivKeyObj,
    publicKey: recipientPublicKey,
  })

  // HKDF-Extract(auth_secret, ecdh_secret) → PRK
  const prkKey = crypto.createHmac('sha256', authSecret).update(sharedSecret).digest()

  // HKDF-Expand: ikm_info = "WebPush: info\x00" + recipient_pub + server_pub
  const ikmInfo = Buffer.concat([
    Buffer.from('WebPush: info\x00'),
    recipientPubKey,
    serverPublicKey,
  ])
  const ikm = expandHkdf(prkKey, ikmInfo, 32)

  // Salt
  const salt = crypto.randomBytes(16)

  // HKDF for content encryption key and nonce
  const prkContent = crypto.createHmac('sha256', salt).update(ikm).digest()

  const cekInfo = Buffer.from('Content-Encoding: aes128gcm\x00')
  const cek = expandHkdf(prkContent, cekInfo, 16)

  const nonceInfo = Buffer.from('Content-Encoding: nonce\x00')
  const nonce = expandHkdf(prkContent, nonceInfo, 12)

  // Pad and encrypt
  // RFC 8291: delimiter \x02 + padding
  const padded = Buffer.concat([plaintext, Buffer.from([0x02])])

  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce)
  const encrypted = Buffer.concat([cipher.update(padded), cipher.final()])
  const authTag = cipher.getAuthTag()
  const ciphertext = Buffer.concat([encrypted, authTag])

  return { ciphertext, salt, serverPublicKey }
}

function expandHkdf(prk: Buffer, info: Buffer, length: number): Buffer {
  const hmac = crypto.createHmac('sha256', prk)
  hmac.update(info)
  hmac.update(Buffer.from([0x01]))
  return hmac.digest().slice(0, length)
}

// ── Stuur één push notificatie ─────────────────────────────────────────────────

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth_key: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  subject: string,
): Promise<{ ok: boolean; status?: number; gone?: boolean }> {
  const url = new URL(subscription.endpoint)
  const audience = `${url.protocol}//${url.host}`

  const jwt = makeVapidJwt(audience, vapidPrivateKey, subject)
  const vapidHeader = `vapid t=${jwt},k=${vapidPublicKey}`

  try {
    const { ciphertext, salt, serverPublicKey } = await encryptPayload(
      payload,
      subscription.p256dh,
      subscription.auth_key,
    )

    // RFC 8291 header: salt (16) + rs (4, BE) + keyid_len (1) + keyid (65)
    const rs = Buffer.allocUnsafe(4)
    rs.writeUInt32BE(4096, 0)
    const keyIdLen = Buffer.from([serverPublicKey.length])
    const header = Buffer.concat([salt, rs, keyIdLen, serverPublicKey])
    const body = Buffer.concat([header, ciphertext])

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': vapidHeader,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
      },
      body,
    })

    if (response.status === 410 || response.status === 404) {
      return { ok: false, status: response.status, gone: true }
    }
    return { ok: response.ok, status: response.status }
  } catch (err) {
    console.error('[push/send] Fout bij sturen:', err)
    return { ok: false }
  }
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: 'VAPID keys niet geconfigureerd' }, { status: 503 })
  }

  const body = await request.json() as {
    userIds: string[]
    title: string
    body: string
    url?: string
    tag?: string
  }

  const { userIds, title, body: msgBody, url = '/', tag } = body

  if (!userIds?.length || !title || !msgBody) {
    return NextResponse.json({ error: 'userIds, title en body zijn verplicht' }, { status: 400 })
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })

  // Haal subscriptions op voor de opgegeven gebruikers
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth_key')
    .in('user_id', userIds)

  if (!subs?.length) {
    return NextResponse.json({ sent: 0, skipped: 0 })
  }

  const payload = JSON.stringify({ title, body: msgBody, url, tag: tag ?? 'cueboard' })
  const goneIds: string[] = []
  let sent = 0

  await Promise.allSettled(
    subs.map(async (sub) => {
      const result = await sendWebPush(sub, payload, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!, VAPID_SUBJECT)
      if (result.ok) {
        sent++
      } else if (result.gone) {
        goneIds.push(sub.id)
      }
    })
  )

  // Verwijder verlopen subscriptions
  if (goneIds.length) {
    await admin.from('push_subscriptions').delete().in('id', goneIds)
  }

  return NextResponse.json({ sent, expired: goneIds.length })
}
