import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { env } from "~/env/server";
import { setServiceStatus } from "@/lib/bootinfo";
import * as schema from "./schema";

export const db = drizzle(env.DATABASE_URL, {
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
