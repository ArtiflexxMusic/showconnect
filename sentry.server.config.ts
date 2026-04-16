import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 10% van transactions naar Sentry. Free-plan quota sparen.
  tracesSampleRate: 0.1,

  // Alleen rapporteren vanaf preview/production. Lokaal ruis voorkomen.
  enabled: process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview',

  environment: process.env.VERCEL_ENV ?? 'development',
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  // Breadcrumbs en console logs meesturen op error-niveau voor context.
  integrations: [
    Sentry.consoleLoggingIntegration({ levels: ['error', 'warn'] }),
  ],
})
