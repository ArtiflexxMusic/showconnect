// CueBoard Service Worker
const CACHE_NAME = 'cueboard-v1'

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/dashboard',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Pre-cache shell assets (best-effort)
      return cache.addAll(PRECACHE_ASSETS).catch(() => {})
    })
  )
  // Activate immediately without waiting
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Delete old caches
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return

  // For navigation requests: network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful page responses
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          return response
        })
        .catch(() =>
          // Offline fallback: try cache
          caches.match(request).then((cached) => cached || caches.match('/dashboard'))
        )
    )
    return
  }

  // For static assets (_next/static): cache-first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          return response
        })
      })
    )
    return
  }

  // For API/Supabase requests: network-only (real-time data)
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) return

  // Everything else: network-first
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  )
})
