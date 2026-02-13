# Sentry Integration

Sentry is implemented as a self-contained pluggable module under `src/integrations/sentry/`. It provides full-stack error monitoring and performance tracing for both server and client, and can be added or removed without touching unrelated code.

---

## Table of Contents

1. [Directory Structure](#directory-structure)
2. [How It Works](#how-it-works)
3. [File Breakdown](#file-breakdown)
4. [Environment Variables](#environment-variables)
5. [Initialization Flow](#initialization-flow)
6. [Using Sentry in Application Code](#using-sentry-in-application-code)
7. [Configuration Options](#configuration-options)
8. [Setup Guide (Adding to a Fresh Project)](#setup-guide)
9. [Removal Guide](#removal-guide)

---

## Directory Structure

```
project root
├── instrument.server.mjs                  # Server entry-point hook (calls initSentryServer)
└── src/
    ├── env/server.ts                      # Extends sentryEnv for typed access
    ├── router.tsx                          # Calls initSentryClient on browser
    └── integrations/sentry/
        ├── index.ts                       # Barrel exports (sentryEnv, initSentryClient, initSentryServer)
        ├── env.ts                         # Standalone createEnv with Sentry variables
        ├── client.ts                      # Browser-side Sentry.init wrapper
        └── server.ts                      # Server-side Sentry.init wrapper
```

---

## How It Works

Sentry requires initialization in two separate contexts — **server** and **client** — because they run in different JavaScript environments with different timing requirements.

### Dual initialization model

```
Server boot                              Browser boot
─────────────                            ────────────
instrument.server.mjs                    src/router.tsx
    │                                        │
    ▼                                        ▼
initSentryServer()                       initSentryClient()
(src/integrations/sentry/server.ts)      (src/integrations/sentry/client.ts)
    │                                        │
    ▼                                        ▼
Sentry.init({                            Sentry.init({
  dsn, sendDefaultPii,                     dsn, sendDefaultPii,
  tracesSampleRate,                        tracesSampleRate,
  replaysSessionSampleRate,                integrations: []
  replaysOnErrorSampleRate                 })
})
```

### Self-contained environment

Like the Drizzle integration, the module owns its environment variables. `env.ts` declares and validates them independently, and the central `src/env/server.ts` merges them via `extends: [sentryEnv]`.

### Graceful degradation

Both `initSentryClient()` and `initSentryServer()` check for `VITE_SENTRY_DSN` before calling `Sentry.init()`. If the DSN is not set:
- **Server**: logs a warning and returns (app continues without monitoring)
- **Client**: silently returns (no console noise in the browser)

This means Sentry is opt-in — the app runs fine without it.

---

## File Breakdown

### `env.ts` — Environment validation

Creates a standalone `@t3-oss/env-core` env object with all Sentry-related variables. All are optional since Sentry is not required to run the app.

| Variable | Purpose |
|---|---|
| `VITE_SENTRY_DSN` | Sentry project DSN (used on both client and server) |
| `VITE_SENTRY_ORG` | Sentry organization slug (for source map uploads) |
| `VITE_SENTRY_PROJECT` | Sentry project slug (for source map uploads) |
| `SENTRY_AUTH_TOKEN` | Auth token for CI/source map uploads |

### `client.ts` — Browser-side initialization

Exports `initSentryClient()` which is called from `src/router.tsx` when the app boots in the browser.

- Reads DSN from `import.meta.env.VITE_SENTRY_DSN` (Vite injects this at build time)
- No-ops if DSN is absent
- Configures error tracking and performance tracing
- Does not enable session replay on the client (server handles replay config)

### `server.ts` — Server-side initialization

Exports `initSentryServer()` which is called from the root `instrument.server.mjs`.

- Reads DSN from `import.meta.env` with fallback to `process.env` (covers both Vite and Node contexts)
- Logs a warning if DSN is missing
- Enables full session replay sampling (`replaysSessionSampleRate: 1.0`) and error replay (`replaysOnErrorSampleRate: 1.0`)
- Must be loaded **before** the application code via Node's `--import` flag

### `index.ts` — Barrel exports

Re-exports the public API:
- `sentryEnv` — the env object (for extending)
- `initSentryClient` — browser init function
- `initSentryServer` — server init function

---

## Environment Variables

| Variable | Required | Client | Server | Description |
|---|---|---|---|---|
| `VITE_SENTRY_DSN` | No | Yes | Yes | Sentry project DSN |
| `VITE_SENTRY_ORG` | No | No | CI | Organization slug for source maps |
| `VITE_SENTRY_PROJECT` | No | No | CI | Project slug for source maps |
| `SENTRY_AUTH_TOKEN` | No | No | CI | Auth token for source map uploads |

Add these to your `.env` or `.env.local`:

```
VITE_SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
VITE_SENTRY_ORG=my-org
VITE_SENTRY_PROJECT=my-project
SENTRY_AUTH_TOKEN=sntrys_...
```

### Why VITE_ prefix?

`VITE_SENTRY_DSN` uses the `VITE_` prefix because it needs to be available in the browser bundle. Vite only exposes environment variables prefixed with `VITE_` to client-side code via `import.meta.env`. The DSN is a public key (not secret), so this is safe.

`SENTRY_AUTH_TOKEN` does **not** have the prefix because it's a secret used only in CI for uploading source maps.

### How typing flows

1. `sentry/env.ts` validates all 4 variables and exports `sentryEnv`
2. `src/env/server.ts` uses `extends: [drizzleEnv, sentryEnv]` in its `createEnv()` call
3. The resulting `env` object includes all Sentry variables alongside other server env vars
4. TypeScript infers the merged type — `env.VITE_SENTRY_DSN` is `string | undefined`

---

## Initialization Flow

### Server-side (runs first)

1. Node starts with `--import ./instrument.server.mjs`
2. `instrument.server.mjs` imports and calls `initSentryServer()`
3. Sentry SDK instruments Node.js before any application code loads
4. All HTTP requests, database queries, and errors are automatically captured

The `--import` flag is critical — it ensures Sentry patches Node internals before the app imports any modules. This is configured in `package.json`:

```json
{
  "scripts": {
    "dev": "dotenv -e .env -- sh -c \"NODE_OPTIONS='--import ./instrument.server.mjs' vite dev --port 3000\"",
    "start": "node --import ./.output/server/instrument.server.mjs .output/server/index.mjs"
  }
}
```

### Client-side (runs on browser)

1. `src/router.tsx` creates the TanStack router
2. After router setup, checks `!router.isServer`
3. Calls `initSentryClient()` to initialize Sentry in the browser
4. Client-side errors, navigation performance, and custom spans are captured

---

## Using Sentry in Application Code

Application code imports directly from `@sentry/tanstackstart-react`, not from the integration module. The integration module handles initialization only.

### Capturing errors

```ts
import * as Sentry from "@sentry/tanstackstart-react";

try {
    await riskyOperation();
} catch (error) {
    Sentry.captureException(error);
}
```

### Performance tracing with spans

```ts
import * as Sentry from "@sentry/tanstackstart-react";

const result = await Sentry.startSpan(
    { name: "Fetch user data", op: "db.query" },
    async () => {
        return await db.select().from(users);
    }
);
```

### Adding context

```ts
import * as Sentry from "@sentry/tanstackstart-react";

Sentry.setContext("order", {
    orderId: "12345",
    amount: 99.99,
});
```

### Route error boundaries

```tsx
import * as Sentry from "@sentry/tanstackstart-react";
import { useEffect } from "react";

export const Route = createFileRoute("/my-page")({
    component: MyPage,
    errorComponent: ({ error }) => {
        useEffect(() => {
            Sentry.captureException(error);
        }, [error]);
        return <div>Something went wrong: {error.message}</div>;
    },
});
```

### Demo page

A full interactive demo page is available at `/demo/sentry/testing`. It demonstrates:
- Client-side error capture
- Server-side error capture
- Client-side performance tracing
- Server-side performance tracing

---

## Configuration Options

### Client-side (`client.ts`)

| Option | Default | Description |
|---|---|---|
| `tracesSampleRate` | `1.0` | Percentage of transactions to capture (0.0 to 1.0) |
| `sendDefaultPii` | `true` | Include user IP and request headers |
| `integrations` | `[]` | Additional Sentry integrations |

### Server-side (`server.ts`)

| Option | Default | Description |
|---|---|---|
| `tracesSampleRate` | `1.0` | Percentage of transactions to capture |
| `sendDefaultPii` | `true` | Include user IP and request headers |
| `replaysSessionSampleRate` | `1.0` | Percentage of sessions to replay |
| `replaysOnErrorSampleRate` | `1.0` | Percentage of error sessions to replay |

### Adjusting for production

For high-traffic production apps, lower the sample rates to reduce volume and costs:

```ts
// In server.ts
Sentry.init({
    dsn,
    sendDefaultPii: true,
    tracesSampleRate: 0.1,           // 10% of transactions
    replaysSessionSampleRate: 0.1,   // 10% of sessions
    replaysOnErrorSampleRate: 1.0,   // 100% of error sessions (keep this high)
});
```

```ts
// In client.ts
Sentry.init({
    dsn,
    tracesSampleRate: 0.1,           // 10% of transactions
    sendDefaultPii: true,
});
```

---

## Setup Guide

### Adding Sentry to a fresh project

#### 1. Install the SDK

```bash
pnpm add @sentry/tanstackstart-react
```

#### 2. Copy the integration folder

Copy `src/integrations/sentry/` into your project.

#### 3. Create `instrument.server.mjs` at the project root

```js
import { initSentryServer } from './src/integrations/sentry/server'

initSentryServer()
```

#### 4. Wire up the client initialization

In `src/router.tsx`, import and call the client init:

```ts
import { initSentryClient } from "./integrations/sentry/client";

export const getRouter = () => {
    // ... router setup ...

    if (!router.isServer) {
        initSentryClient();
    }

    return router;
};
```

#### 5. Wire up environment variables

In `src/env/server.ts`, add the import and extend:

```ts
import { sentryEnv } from "@/integrations/sentry/env";

export const env = createEnv({
    server: { /* ...your vars... */ },
    extends: [sentryEnv],       // <-- add this
    runtimeEnv: { /* ... */ },
});
```

#### 6. Configure the Node `--import` flag

In `package.json`, ensure the server loads the instrument file before app code:

```json
{
  "scripts": {
    "dev": "dotenv -e .env -- sh -c \"NODE_OPTIONS='--import ./instrument.server.mjs' vite dev --port 3000\"",
    "start": "node --import ./.output/server/instrument.server.mjs .output/server/index.mjs"
  }
}
```

#### 7. Set environment variables

Add to `.env` or `.env.local`:

```
VITE_SENTRY_DSN=https://your-dsn@o0.ingest.sentry.io/0
```

#### 8. Verify

- Start the app: `pnpm dev`
- If DSN is set, no warning in the console — Sentry is active
- If DSN is missing, you'll see: `VITE_SENTRY_DSN is not defined. Sentry is not running.`
- Trigger an error and check your Sentry dashboard

---

## Removal Guide

### Removing Sentry from the project

#### 1. Delete the integration

```bash
rm -r src/integrations/sentry/
```

#### 2. Remove env extension

In `src/env/server.ts`:
- Delete `import { sentryEnv } from "@/integrations/sentry/env"`
- Remove `sentryEnv` from the `extends` array

#### 3. Remove client initialization

In `src/router.tsx`:
- Delete `import { initSentryClient } from "./integrations/sentry/client"`
- Delete the `initSentryClient()` call inside the `if (!router.isServer)` block

#### 4. Remove server instrumentation

Either delete `instrument.server.mjs` entirely, or remove the Sentry import if it contains other instrumentation.

If deleting, also remove `--import ./instrument.server.mjs` from the `dev` and `start` scripts in `package.json`.

#### 5. Remove demo page (optional)

```bash
rm src/routes/demo/sentry.testing.tsx
```

Remove the Sentry nav link from `src/components/Header.tsx`.

#### 6. Remove the dependency

```bash
pnpm remove @sentry/tanstackstart-react
```

#### 7. Clean up any Sentry imports in app code

Search for and remove any remaining `import * as Sentry from "@sentry/tanstackstart-react"` in your routes or components.
