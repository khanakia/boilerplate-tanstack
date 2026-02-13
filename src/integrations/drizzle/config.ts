export const drizzleKitConfig = {
	dialect: "postgresql" as const,
	schema: "./src/integrations/drizzle/schema.ts",
	out: "./src/integrations/drizzle/migrations",
};
