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
          '/green-room/',
          '/invite/',
        ],
      },
    ],
    sitemap: 'https://cueboard.nl/sitemap.xml',
    host: 'https://cueboard.nl',
  }
}
