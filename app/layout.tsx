import type { Metadata, Viewport } from 'next'
import { Space_Grotesk } from 'next/font/google'
import { Toaster } from '@/components/ui/toast'
import { ChatWidgetMount } from '@/components/chatbot/chat-widget-mount'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  // 'optional': font wordt niet geblokkeerd bij laden — browser gebruikt fallback
  // totdat het font klaar is. Geen layout shift, snelste First Contentful Paint.
  display: 'optional',
  // Alleen de weights die we echt gebruiken (300 en 700 komen nergens voor)
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: {
    default: 'CueBoard — Show OS voor live events',
    template: '%s – CueBoard',
  },
  description: 'Het professionele show-besturingssysteem voor live events. Caller, crew, cast en presentatoren — realtime gesynchroniseerd op elk apparaat.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CueBoard',
    startupImage: '/apple-touch-icon.png',
  },
  icons: {
    icon: [
      { url: '/favicon.ico',       sizes: 'any' },
      { url: '/cueboard-icon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png',    sizes: '32x32',   type: 'image/png' },
      { url: '/icon-192.png',      sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'CueBoard — Show OS voor live events',
    description: 'Professioneel rundown-systeem. Caller, crew en cast realtime gesynchroniseerd.',
    type: 'website',
    locale: 'nl_NL',
    url: 'https://cueboard.nl',
    siteName: 'CueBoard',
    images: [
      {
        url: 'https://cueboard.nl/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'CueBoard — Show OS voor live events',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CueBoard — Show OS voor live events',
    description: 'Professioneel rundown-systeem. Caller, crew en cast realtime gesynchroniseerd.',
    images: ['https://cueboard.nl/opengraph-image'],
  },
}

export const viewport: Viewport = {
  themeColor: '#050f09',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={`dark ${spaceGrotesk.variable}`}>
      <head>
        {/* DNS + TCP + TLS al klaar vóór de eerste Supabase-request */}
        <link rel="preconnect" href="https://gvvwetqifyzslrxwujqe.supabase.co" />
        <link rel="dns-prefetch" href="https://gvvwetqifyzslrxwujqe.supabase.co" />
      </head>
      <body className={spaceGrotesk.className}>
        {children}
        <Toaster />
        <ChatWidgetMount />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.warn('SW registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
