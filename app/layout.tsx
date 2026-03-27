import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'ShowConnect',
    template: '%s | ShowConnect',
  },
  description: 'Real-time show control & rundown beheer voor live events',
  icons: { icon: '/favicon.ico' },
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className="dark">
      <body>{children}</body>
    </html>
  )
}
