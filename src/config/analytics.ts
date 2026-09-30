import { env } from './env'

export type AnalyticsProvider = 'plausible' | 'umami' | 'none'

function provider(): AnalyticsProvider {
  const p = env('VITE_ANALYTICS_PROVIDER').toLowerCase()
  if (p === 'plausible' && env('VITE_PLAUSIBLE_DOMAIN')) return 'plausible'
  if (p === 'umami' && env('VITE_UMAMI_WEBSITE_ID') && env('VITE_UMAMI_URL')) return 'umami'
  return 'none'
}

export const analyticsConfig = {
  provider: provider(),
  plausible: {
    domain: env('VITE_PLAUSIBLE_DOMAIN'),
    /** Self-hosted Plausible: point this at your instance's script. */
    scriptUrl: env('VITE_PLAUSIBLE_SCRIPT_URL', 'https://plausible.io/js/script.manual.js'),
  },
  umami: {
    url: env('VITE_UMAMI_URL').replace(/\/+$/, ''),
    websiteId: env('VITE_UMAMI_WEBSITE_ID'),
  },
}

export const sentryConfig = {
  dsn: env('VITE_SENTRY_DSN'),
  /** Share of sessions traced for performance (0 = off). */
  tracesSampleRate: Number(env('VITE_SENTRY_TRACES_SAMPLE_RATE', '0')),
}
