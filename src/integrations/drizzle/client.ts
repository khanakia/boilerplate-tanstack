import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { setServiceStatus } from "@/lib/bootinfo";
import { drizzleEnv } from "./env";
import * as schema from "./schema";

export const db = drizzle(drizzleEnv.DATABASE_URL, {
	schema,
	casing: "snake_case",
});

// Register database boot status
db.execute(sql`SELECT 1`)
	.then(() => {
		setServiceStatus("database", {
			status: "ok",
			message: "PostgreSQL connected",
		});
	})
	.catch((error: Error) => {
		setServiceStatus("database", {
			status: "error",
			error: error.message,
		});
	});
