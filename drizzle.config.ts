import { defineConfig } from "drizzle-kit";
import { drizzleKitConfig } from "./src/integrations/drizzle/config";

export default defineConfig({
	...drizzleKitConfig,
	dbCredentials: {
		url: process.env.DATABASE_URL!,
	},
});
