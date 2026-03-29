'use client'

/**
 * usePushNotifications
 *
 * Beheert Web Push subscription voor de huidige gebruiker.
 *
 * Gebruik:
 *   const { isSupported, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications()
 */

import { useCallback, useEffect, useState } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export type PushStatus = 'idle' | 'loading' | 'subscribed' | 'denied' | 'unsupported' | 'error'

export interface UsePushNotificationsReturn {
  status: PushStatus
  isSupported: boolean
  isSubscribed: boolean
  isLoading: boolean
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [status, setStatus] = useState<PushStatus>('idle')

  const isSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    !!VAPID_PUBLIC_KEY

  // Controleer bestaande subscription bij mount
  useEffect(() => {
    if (!isSupported) {
      setStatus('unsupported')
      return
    }
    setStatus('loading')
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setStatus(sub ? 'subscribed' : 'idle'))
      .catch(() => setStatus('idle'))
  }, [isSupported])

  const subscribe = useCallback(async () => {
    if (!isSupported) return
    setStatus('loading')

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus('denied')
        return
      }

      const reg = await navigator.serviceWorker.ready
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })

      const subJson = sub.toJSON()
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: { p256dh: subJson.keys?.p256dh, auth: subJson.keys?.auth },
        }),
      })

      if (!response.ok) {
        console.error('[usePushNotifications] Opslaan mislukt:', await response.text())
        setStatus('error')
        return
      }

      setStatus('subscribed')
    } catch (err) {
      console.error('[usePushNotifications] Subscribe fout:', err)
      setStatus('error')
    }
  }, [isSupported])

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return
    setStatus('loading')

    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) { setStatus('idle'); return }

      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      })

      await sub.unsubscribe()
      setStatus('idle')
    } catch (err) {
      console.error('[usePushNotifications] Unsubscribe fout:', err)
      setStatus('error')
    }
  }, [isSupported])

  return {
    status,
    isSupported,
    isSubscribed: status === 'subscribed',
    isLoading: status === 'loading',
    subscribe,
    unsubscribe,
  }
}
