'use client'

import { usePathname } from 'next/navigation'
import { ChatWidget } from './chat-widget'

// Paden waar de chatbot NIET mag verschijnen.
// We willen 'm uit op de show-pages zelf (caller, dashboard, status, print, public),
// maar wel op /dashboard/shows (overzicht).
const HIDE_PATTERNS: RegExp[] = [
  /^\/shows\/[^/]+/,            // /shows/[id] (caller)
  /^\/dashboard\/shows\/[^/]+/, // /dashboard/shows/[id] (detail)
  /^\/status\/[^/]+/,           // /status/[id]
  /^\/print\//,                 // /print/...
  /^\/p\/[^/]+/,                // /p/[id] public viewer
  /^\/cast/,                    // cast & cast-login
  /^\/green-room/,
]

export function ChatWidgetMount() {
  const pathname = usePathname()
  if (!pathname) return null
  if (HIDE_PATTERNS.some((re) => re.test(pathname))) return null
  return <ChatWidget />
}
