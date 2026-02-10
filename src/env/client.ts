import { createEnv } from "@t3-oss/env-core";
import { z } from "zod/v4";

/**
 * Client-side environment variables
 * These ARE exposed to the client bundle
 * Must be prefixed with VITE_ for Vite to expose them
 */
export const env = createEnv({
	clientPrefix: "VITE_",
	client: {
		VITE_APP_URL: z.url().min(1, "VITE_APP_URL is required"),
		// Add more client-side env vars here
	},

	runtimeEnv: {
		VITE_APP_URL: import.meta.env.VITE_APP_URL,
	},

	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
