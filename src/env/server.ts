import { createEnv } from "@t3-oss/env-core";
import { z } from "zod/v4";
import { drizzleEnv } from "@/integrations/drizzle/env";
import { sentryEnv } from "@/integrations/sentry/env";

/**
 * Server-side environment variables
 * These are NOT exposed to the client bundle
 */
export const env = createEnv({
	server: {
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),

		// Internal API key for protected endpoints (/api/i/*)
		INTERNAL_KEY: z.string().optional(),

		// Build info (set via Docker build args, optional in dev)
		VITE_APP_VERSION: z.string().default("dev"),
		VITE_APP_COMMIT: z.string().default("unknown"),
		VITE_APP_BRANCH: z.string().default("unknown"),
		VITE_APP_BUILD_TIME: z.string().default("unknown"),
	},

	extends: [drizzleEnv, sentryEnv],

	runtimeEnv: {
		NODE_ENV: process.env.NODE_ENV,
		INTERNAL_KEY: process.env.INTERNAL_KEY,
		VITE_APP_VERSION: process.env.VITE_APP_VERSION,
		VITE_APP_COMMIT: process.env.VITE_APP_COMMIT,
		VITE_APP_BRANCH: process.env.VITE_APP_BRANCH,
		VITE_APP_BUILD_TIME: process.env.VITE_APP_BUILD_TIME,
	},

	onValidationError: (issues) => {
		console.error("Invalid environment variables:", JSON.stringify(issues, null, 2));
		throw new Error("Invalid environment variables");
	},

	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
