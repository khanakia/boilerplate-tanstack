export const drizzleKitConfig = {
	dialect: "postgresql" as const,
	schema: "./src/integrations/drizzle/schema",
	out: "./src/integrations/drizzle/migrations",
};
