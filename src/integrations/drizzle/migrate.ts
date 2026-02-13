import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { drizzleEnv } from "./env";

const runMigrate = async () => {
	const pool = new Pool({
		connectionString: drizzleEnv.DATABASE_URL,
	});
	const db = drizzle({ client: pool });
	console.log("Running migrations...");
	await migrate(db, {
		migrationsFolder: new URL("./migrations", import.meta.url).pathname,
	});
	console.log("Migrations completed!");
	await pool.end();
};

runMigrate().catch((error) => {
	console.error("Migration failed:", error);
	process.exit(1);
});
