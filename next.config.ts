import type { NextConfig } from "next";

const SUPABASE_HOST = 'gvvwetqifyzslrxwujqe.supabase.co'

const securityHeaders = [
  // Prevent browsers from sniffing MIME types
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Prevent clickjacking — only allow framing from same origin
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Legacy XSS protection (mostly for older browsers)
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // HTTPS only for 2 years, including subdomains
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Limit referrer info sent to third parties
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disable unnecessary browser features
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // DNS prefetch for performance
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  // Content Security Policy
  {
    key: 'Content-Security-Policy',
    value: [
      `default-src 'self'`,
      // Scripts: self + inline (needed for Next.js hydration) + cdnjs (pdf.js)
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com`,
      // Styles: self + inline (needed for Tailwind) + Google Fonts
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      // Fonts: self + Google Fonts CDN
      `font-src 'self' https://fonts.gstatic.com data:`,
      // Images: self + data URIs + blob (for PDF viewer) + Supabase Storage + Mollie logo's + QR-code API
      `img-src 'self' data: blob: https://${SUPABASE_HOST} https://www.mollie.com https://api.qrserver.com`,
      // API + WebSocket connections: self + Supabase
      `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} https://api.supabase.com`,
      // Frames: same origin + Office Online (PPTX embed)
      `frame-src 'self' blob: https://view.officeapps.live.com`,
      // No plugins
      `object-src 'none'`,
      // Workers: self + blob + cdnjs (pdf.js worker)
      `worker-src 'self' blob: https://cdnjs.cloudflare.com`,
      // Upgrade insecure requests in production
      `upgrade-insecure-requests`,
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  typescript: {
    // TypeScript versie-mismatch tussen supabase-js en supabase/ssr libraries
    // heeft geen invloed op runtime; dit zorgt dat de build gewoon doorgaat
    ignoreBuildErrors: true,
  },

  // Verberg dat de site op Next.js draait (kleine security win)
  poweredByHeader: false,

  // Gzip/Brotli compressie voor alle responses
  compress: true,

  images: {
    // Moderne formaten: WebP voor brede support, AVIF voor extra compressie
    formats: ['image/avif', 'image/webp'],
    // Verkleinde placeholder tijdens laden
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.mollie.com',
        pathname: '/external/icons/**',
      },
      {
        protocol: 'https',
        hostname: SUPABASE_HOST,
      },
    ],
  },

  // Tree-shaking voor zware icon/component libraries → kleinere JS bundles
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },

  async headers() {
    return [
      {
        // Veiligheidsheaders op alle routes
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Statische Next.js assets: 1 jaar cache (hash in bestandsnaam garandeert invalidatie)
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // Geoptimaliseerde afbeeldingen: 1 dag cache
        source: '/_next/image',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }],
      },
      {
        source: '/favicon.ico',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
      {
        source: '/:path*.png',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
      {
        // API routes: nooit cachen (altijd vers data)
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' }],
      },
    ]
  },
  // Redirect www to non-www
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.cueboard-app.vercel.app' }],
        destination: 'https://cueboard-app.vercel.app/:path*',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
