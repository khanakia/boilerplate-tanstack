import * as Sentry from "@sentry/tanstackstart-react";

/**
 * Initialize Sentry on the client side (called from router.tsx).
 * No-ops if VITE_SENTRY_DSN is not set.
 */
export function initSentryClient() {
	if (import.meta.env.VITE_SENTRY_ENABLED !== "true") return;

	const dsn = import.meta.env.VITE_SENTRY_DSN;
	if (!dsn) return;

	Sentry.init({
		dsn,
		integrations: [],
		tracesSampleRate: 1.0,
		sendDefaultPii: true,
	});
}
