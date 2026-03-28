import type { Metadata, Viewport } from 'next'
import { Space_Grotesk } from 'next/font/google'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
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
      <body className={spaceGrotesk.className}>
        {children}
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
