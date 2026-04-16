import * as Sentry from '@sentry/nextjs'

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // 10% van paginaloads naar Sentry voor performance-metingen.
    tracesSampleRate: 0.1,

    // Session Replay uit: kost te veel van de free-plan quota (50/mnd).
    // Aan zetten als je een specifieke bug wil reproduceren.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // Alleen op preview/production, niet lokaal.
    enabled: process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' || process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview',

    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

    // Filter ruis uit browser extensions, ad-blockers etc.
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      /Non-Error promise rejection captured/,
    ],
  })
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
