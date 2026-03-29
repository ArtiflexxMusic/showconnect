#!/usr/bin/env node
/**
 * Genereer VAPID sleutelpaar voor Web Push notificaties.
 *
 * Gebruik: node scripts/gen-vapid-keys.js
 *
 * Voeg de output toe aan .env.local en Vercel environment variables.
 */

const crypto = require('crypto')

const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' })

const pubDer = publicKey.export({ type: 'spki', format: 'der' })
const rawPub = pubDer.slice(pubDer.length - 65)

const jwk = privateKey.export({ format: 'jwk' })
const rawPriv = Buffer.from(jwk.d, 'base64').toString('base64url')

console.log('\n=== VAPID Keys ===\n')
console.log(`VAPID_PUBLIC_KEY=${rawPub.toString('base64url')}`)
console.log(`VAPID_PRIVATE_KEY=${rawPriv}`)
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${rawPub.toString('base64url')}`)
console.log(`VAPID_SUBJECT=mailto:info@artiflexx.nl`)
console.log('\nVoeg bovenstaande toe aan .env.local en Vercel project settings.\n')
