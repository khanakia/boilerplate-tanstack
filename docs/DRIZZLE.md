# Drizzle ORM Integration

Drizzle ORM is implemented as a self-contained pluggable module under `src/integrations/drizzle/`. It can be added to or removed from the boilerplate without touching unrelated code.

---

## Table of Contents

1. [Directory Structure](#directory-structure)
2. [How It Works](#how-it-works)
3. [File Breakdown](#file-breakdown)
4. [Environment Variables](#environment-variables)
5. [Taskfile Commands](#taskfile-commands)
6. [Working with Schema](#working-with-schema)
7. [Migrations](#migrations)
8. [Using the Database Client](#using-the-database-client)
9. [Setup Guide (Adding to a Fresh Project)](#setup-guide)
10. [Removal Guide](#removal-guide)

---

## Directory Structure

```
project root
├── drizzle.config.ts                       # Thin wrapper (required at root by drizzle-kit)
├── Taskfile.yml                            # Includes db: tasks
└── src/
    ├── env/server.ts                       # Extends drizzleEnv for DATABASE_URL typing
    └── integrations/drizzle/
        ├── index.ts                        # Barrel exports (db, schema, drizzleEnv)
        ├── env.ts                          # Standalone createEnv with DATABASE_URL
        ├── client.ts                       # Drizzle client instance + boot status check
        ├── schema.ts                       # Table definitions
        ├── config.ts                       # Drizzle-kit config values (dialect, paths)
        ├── migrate.ts                      # Migration runner script
        ├── Taskfile.yml                    # db:generate, db:migrate, db:push, db:studio
        └── migrations/                     # Generated SQL migration files
```

---

## How It Works

The integration follows three key design principles:

### 1. Self-contained environment validation

The module owns its `DATABASE_URL` variable. Instead of defining it in the central `src/env/server.ts`, the drizzle module declares and validates it independently in `env.ts` using `@t3-oss/env-core`. The central server env then merges it via the `extends` option:

```
drizzle/env.ts  ──creates──>  drizzleEnv (has DATABASE_URL)
                                   │
src/env/server.ts  ──extends──>  [drizzleEnv]
                                   │
                              env.DATABASE_URL is fully typed
```

This means `env.DATABASE_URL` remains accessible everywhere through the central `env` object, but the validation logic lives inside the drizzle module.

### 2. Root config is a thin wrapper

Drizzle-kit requires `drizzle.config.ts` at the project root. Rather than duplicating config values, the root file imports shared values from the module:

```ts
// drizzle.config.ts (root)
import { drizzleKitConfig } from "./src/integrations/drizzle/config";

export default defineConfig({
    ...drizzleKitConfig,          // dialect, schema path, output path
    dbCredentials: { url: ... },  // only credentials added here
});
```

### 3. Taskfile inclusion

Database commands are defined in the module's own `Taskfile.yml` and included in the root Taskfile under the `db:` prefix. The `dir: .` setting ensures all commands run from the project root (required by drizzle-kit).

---

## File Breakdown

### `env.ts` — Environment validation

Creates a standalone `@t3-oss/env-core` env object with just `DATABASE_URL`. Exported as `drizzleEnv` so other env files can extend it.

- Validates `DATABASE_URL` is a non-empty string
- Respects `SKIP_ENV_VALIDATION` for CI/build contexts
- Treats empty strings as undefined

### `client.ts` — Database client

Creates the Drizzle ORM client instance and registers a boot health check.

- Uses `drizzle()` from `drizzle-orm/node-postgres` with the PostgreSQL URL
- Loads all schema with `schema` option for relational query support
- Uses `snake_case` casing convention (TypeScript camelCase maps to SQL snake_case)
- Runs `SELECT 1` on startup and reports status to the boot info system

### `schema.ts` — Table definitions

Contains all Drizzle table definitions. Currently includes a `users` table as an example:

- `id` — auto-incrementing integer primary key
- `name` — varchar(255), required
- `email` — varchar(255), required, unique
- `createdAt` — timestamp, defaults to now
- `updatedAt` — timestamp, auto-updates on change

Add new tables to this file or split into multiple schema files (update `config.ts` schema path to a glob if you do).

### `config.ts` — Drizzle-kit configuration

Exports shared config values used by both the root `drizzle.config.ts` and potentially other tooling:

- `dialect: "postgresql"` — database engine
- `schema` — path to schema file(s)
- `out` — output directory for generated migrations

### `migrate.ts` — Migration runner

A standalone script that runs pending migrations against the database. Uses `import.meta.url` to resolve the `migrations/` folder relative to its own location, so it works regardless of where you invoke it from.

Run via: `task db:migrate`

### `index.ts` — Barrel exports

Re-exports the public API:

- `db` — the Drizzle client instance
- `drizzleEnv` — the env object (for extending)
- All schema exports (tables, relations, etc.)

### `Taskfile.yml` — Task definitions

Defines four tasks included under the `db:` prefix:

| Command | Description |
|---|---|
| `task db:generate` | Diff schema against migrations and generate new SQL |
| `task db:migrate` | Run pending migrations against the database |
| `task db:push` | Push schema directly to DB (skips migration files) |
| `task db:studio` | Open Drizzle Studio GUI in the browser |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |

Format: `postgresql://user:password@host:port/database`

Set in `.env` (loaded by Taskfile) or `.env.local` (loaded by the dev server).

### How typing flows

1. `drizzle/env.ts` validates `DATABASE_URL` and exports `drizzleEnv`
2. `src/env/server.ts` uses `extends: [drizzleEnv]` in its `createEnv()` call
3. The resulting `env` object includes `DATABASE_URL` alongside all other server env vars
4. TypeScript infers the merged type automatically — `env.DATABASE_URL` is `string`

---

## Taskfile Commands

All commands require `DATABASE_URL` to be set (via `.env` or environment).

### Generate migrations

```bash
task db:generate
```

Reads `schema.ts`, compares against existing migrations in `migrations/`, and generates a new SQL migration file if there are changes.

### Run migrations

```bash
task db:migrate
```

Applies all pending migrations to the database in order. Uses the TypeScript migration runner (`migrate.ts`) executed via `pnpm tsx`.

### Push schema (development)

```bash
task db:push
```

Pushes the current schema directly to the database without creating migration files. Useful during early development when you're iterating on schema design.

### Open Drizzle Studio

```bash
task db:studio
```

Launches the Drizzle Studio web GUI for browsing and editing database data.

---

## Working with Schema

### Adding a new table

Edit `src/integrations/drizzle/schema.ts`:

```ts
import { integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const posts = pgTable("posts", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    title: varchar({ length: 255 }).notNull(),
    body: text().notNull(),
    authorId: integer()
        .notNull()
        .references(() => users.id),
    createdAt: timestamp().notNull().defaultNow(),
});
```

Then generate a migration:

```bash
task db:generate
task db:migrate
```

### Casing convention

The client is configured with `casing: "snake_case"`. This means:

- Define columns in TypeScript using **camelCase** (`createdAt`, `authorId`)
- Drizzle automatically maps them to **snake_case** in SQL (`created_at`, `author_id`)

### Splitting schema files

If your schema grows large, split into multiple files:

```
src/integrations/drizzle/
    schema/
        users.ts
        posts.ts
        index.ts     # re-exports everything
```

Update `config.ts` to use a glob:

```ts
export const drizzleKitConfig = {
    dialect: "postgresql" as const,
    schema: "./src/integrations/drizzle/schema/*.ts",
    out: "./src/integrations/drizzle/migrations",
};
```

And update `client.ts` to import from the new location.

---

## Migrations

### Where migrations live

Generated migrations are stored in `src/integrations/drizzle/migrations/`. Each migration is a timestamped SQL file.

### Migration workflow

1. Modify `schema.ts`
2. Run `task db:generate` — creates a new SQL file in `migrations/`
3. Review the generated SQL
4. Run `task db:migrate` — applies it to the database
5. Commit the migration file to version control

### Push vs migrate

| | `db:push` | `db:migrate` |
|---|---|---|
| Creates migration files | No | Yes (via `db:generate`) |
| Safe for production | No | Yes |
| Good for prototyping | Yes | No |
| Tracks schema history | No | Yes |

Use `db:push` during early development, switch to `db:generate` + `db:migrate` once the schema stabilizes.

---

## Using the Database Client

### Basic queries

```ts
import { db } from "@/integrations/drizzle";
import { users } from "@/integrations/drizzle";

// Select all users
const allUsers = await db.select().from(users);

// Insert a user
await db.insert(users).values({
    name: "Jane Doe",
    email: "jane@example.com",
});

// Query with filter
const user = await db.select().from(users).where(eq(users.email, "jane@example.com"));
```

### Relational queries

Because the client is initialized with `schema`, you can use Drizzle's relational query API:

```ts
import { db } from "@/integrations/drizzle";

const result = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, "jane@example.com"),
});
```

### In tRPC procedures

```ts
import { db, users } from "@/integrations/drizzle";

export const userRouter = router({
    list: publicProcedure.query(async () => {
        return db.select().from(users);
    }),
});
```

---

## Setup Guide

### Adding Drizzle to a fresh project

#### 1. Install dependencies

```bash
pnpm add drizzle-orm pg
pnpm add -D drizzle-kit @types/pg
```

#### 2. Copy the integration folder

Copy the entire `src/integrations/drizzle/` directory into your project.

#### 3. Create root drizzle.config.ts

```ts
import { defineConfig } from "drizzle-kit";
import { drizzleKitConfig } from "./src/integrations/drizzle/config";

export default defineConfig({
    ...drizzleKitConfig,
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
});
```

#### 4. Wire up environment variables

In `src/env/server.ts`, add the import and extend:

```ts
import { drizzleEnv } from "@/integrations/drizzle/env";

export const env = createEnv({
    server: { /* ...your vars... */ },
    extends: [drizzleEnv],       // <-- add this
    runtimeEnv: { /* ... */ },
});
```

#### 5. Add Taskfile include

In the root `Taskfile.yml`:

```yaml
includes:
  db:
    taskfile: src/integrations/drizzle/Taskfile.yml
    dir: .
```

#### 6. Set DATABASE_URL

Add to your `.env`:

```
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
```

#### 7. Verify

```bash
task db:push     # push schema to database
pnpm dev         # app should boot with DB connected
```

---

## Removal Guide

### Removing Drizzle from the project

#### 1. Delete the integration

```bash
rm -r src/integrations/drizzle/
```

#### 2. Remove env extension

In `src/env/server.ts`:
- Delete `import { drizzleEnv } from "@/integrations/drizzle/env"`
- Delete `extends: [drizzleEnv],`

#### 3. Remove Taskfile include

In root `Taskfile.yml`, remove:

```yaml
  db:
    taskfile: src/integrations/drizzle/Taskfile.yml
    dir: .
```

#### 4. Delete root config

```bash
rm drizzle.config.ts
```

#### 5. Remove dependencies

```bash
pnpm remove drizzle-orm pg drizzle-kit @types/pg
```

#### 6. Remove any db imports

Search for and remove any remaining imports from `@/integrations/drizzle` in your application code.
