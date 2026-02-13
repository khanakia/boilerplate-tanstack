import * as Sentry from '@sentry/tanstackstart-react'

const sentryEnabled = (import.meta.env?.VITE_SENTRY_ENABLED ?? process.env.VITE_SENTRY_ENABLED) === 'true'
const sentryDsn = import.meta.env?.VITE_SENTRY_DSN ?? process.env.VITE_SENTRY_DSN

if (!sentryEnabled) {
  // Explicitly disabled via VITE_SENTRY_ENABLED=false
} else if (!sentryDsn) {
  console.warn('VITE_SENTRY_DSN is not defined. Sentry is not running.')
} else {
  Sentry.init({
    dsn: sentryDsn,
    sendDefaultPii: true,
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 1.0,
    replaysOnErrorSampleRate: 1.0,
  })
}
