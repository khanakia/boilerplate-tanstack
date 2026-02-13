import { createEnv } from "@t3-oss/env-core";
import { z } from "zod/v4";

export const drizzleEnv = createEnv({
	server: {
		DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
	},
	runtimeEnv: {
		DATABASE_URL: process.env.DATABASE_URL,
	},
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	emptyStringAsUndefined: true,
});
