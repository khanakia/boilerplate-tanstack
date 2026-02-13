import { createEnv } from "@t3-oss/env-core";
import { z } from "zod/v4";

export const sentryEnv = createEnv({
	server: {
		VITE_SENTRY_ENABLED: z.enum(["true", "false"]).default("false"),
		VITE_SENTRY_DSN: z.string().optional(),
		VITE_SENTRY_ORG: z.string().optional(),
		VITE_SENTRY_PROJECT: z.string().optional(),
		SENTRY_AUTH_TOKEN: z.string().optional(),
	},
	runtimeEnv: {
		VITE_SENTRY_ENABLED: process.env.VITE_SENTRY_ENABLED,
		VITE_SENTRY_DSN: process.env.VITE_SENTRY_DSN,
		VITE_SENTRY_ORG: process.env.VITE_SENTRY_ORG,
		VITE_SENTRY_PROJECT: process.env.VITE_SENTRY_PROJECT,
		SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
	},
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
