import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Block internal app routes from indexing
        disallow: [
          '/dashboard',
          '/shows/',
          '/admin',
          '/profile',
          '/api/',
          '/auth/',
          '/cast/',
          '/invite/',
        ],
      },
    ],
    sitemap: 'https://cueboard-app.vercel.app/sitemap.xml',
    host: 'https://cueboard-app.vercel.app',
  }
}
