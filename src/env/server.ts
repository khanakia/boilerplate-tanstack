import { createEnv } from "@t3-oss/env-core";
import { z } from "zod/v4";

/**
 * Server-side environment variables
 * These are NOT exposed to the client bundle
 */
export const env = createEnv({
	server: {
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
		// DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
		// Add more server-side env vars here

		VITE_SENTRY_DSN: z.string().min(1, "VITE_SENTRY_DSN is required"),
		VITE_SENTRY_ORG: z.string().min(1, "VITE_SENTRY_ORG is required"),
		VITE_SENTRY_PROJECT: z.string().min(1, "VITE_SENTRY_PROJECT is required"),
		SENTRY_AUTH_TOKEN: z.string().min(1, "SENTRY_AUTH_TOKEN is required"),
	},

	runtimeEnv: {
		NODE_ENV: process.env.NODE_ENV,
		// DATABASE_URL: process.env.DATABASE_URL,
		VITE_SENTRY_DSN: process.env.VITE_SENTRY_DSN,
		VITE_SENTRY_ORG: process.env.VITE_SENTRY_ORG,
		VITE_SENTRY_PROJECT: process.env.VITE_SENTRY_PROJECT,
		SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
	},

	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
