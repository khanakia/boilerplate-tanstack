import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { setServiceStatus } from "@/lib/bootinfo";
import { drizzleEnv } from "./env";
import * as schema from "./schema";

export const pool = new Pool({
	connectionString: drizzleEnv.DATABASE_URL,
});

export const db = drizzle(pool, {
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
