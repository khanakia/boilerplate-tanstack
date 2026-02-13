import * as Sentry from "@sentry/tanstackstart-react";

/**
 * Initialize Sentry on the server side (called from instrument.server.mjs).
 * No-ops with a warning if VITE_SENTRY_DSN is not set.
 */
export function initSentryServer() {
	const dsn =
		import.meta.env?.VITE_SENTRY_DSN ?? process.env.VITE_SENTRY_DSN;

	if (!dsn) {
		console.warn("VITE_SENTRY_DSN is not defined. Sentry is not running.");
		return;
	}

	Sentry.init({
		dsn,
		sendDefaultPii: true,
		tracesSampleRate: 1.0,
		replaysSessionSampleRate: 1.0,
		replaysOnErrorSampleRate: 1.0,
	});
}
