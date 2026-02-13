# Incident 001: Nitro Build Fails with Rollup `getVariableForExportName` Error

**Date:** 2026-02-13
**Status:** Resolved
**Severity:** Build-breaking

## Symptom

`pnpm build` fails during the Nitro server build phase:

```
Cannot read properties of null (reading 'getVariableForExportName')
    at getVariableForExportNameRecursive (rollup/dist/es/shared/node-entry.js:16858:19)
```

Client and SSR environments build successfully — only the Nitro (server) environment fails.

## Root Cause

Rollup cannot resolve complex re-export chains in `@sentry/*` and `@opentelemetry/*` packages during bundling.

The dependency chain:

```
src/router.tsx
  -> src/integrations/sentry/client.ts
    -> @sentry/tanstackstart-react
      -> @sentry/node
        -> @opentelemetry/api
        -> @opentelemetry/sdk-trace-base
        -> @opentelemetry/instrumentation
        -> ...
```

OpenTelemetry packages use deeply nested `export *` patterns. Rollup's `getVariableForExportNameRecursive` encounters a `null` target module when trying to trace these re-exports, causing the build to crash.

Affected export names observed via debug patch:
- `init`, `fmt`, `getClient`, `context`, `getStringFromEnv` (OpenTelemetry)
- `AST`, `SeverityNumber` (protobuf/OTel types)

## Resolution

Externalize the problematic packages in `vite.config.ts` so Nitro doesn't attempt to bundle them — they resolve from `node_modules` at runtime instead:

```ts
// vite.config.ts
nitro: {
  rollupConfig: {
    external: [
      /^@sentry\//,
      /^@opentelemetry\//,
      /^@prisma\/instrumentation/,
    ],
  },
},
```

## Key Observations

- The error was **pre-existing** and not introduced by any recent code change
- The client and SSR builds use Vite's own bundler which handles these re-exports fine
- Only the Nitro build (which uses rollup directly) is affected
- `rollup@4.57.1` is the version that exhibited this issue
- These packages are designed for Node.js runtime and don't benefit from being bundled

## Prevention

When adding Node.js-native packages (database drivers, instrumentation SDKs, etc.) that will run on the server:
1. Check if they need to be externalized from the Nitro build
2. Packages with complex `export *` chains from native/C++ addons are common offenders
3. Add them to `nitro.rollupConfig.external` in `vite.config.ts`
