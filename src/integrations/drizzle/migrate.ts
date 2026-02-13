import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzleEnv } from "./env";

const db = drizzle(drizzleEnv.DATABASE_URL);
await migrate(db, {
	migrationsFolder: new URL("./migrations", import.meta.url).pathname,
});
console.log("Migrations complete");
process.exit(0);
