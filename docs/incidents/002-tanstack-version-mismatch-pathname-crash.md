# Incident 002: Runtime `TypeError: Cannot read properties of undefined (reading 'pathname')`

**Date:** 2026-02-13
**Status:** Resolved
**Severity:** Runtime crash (500 on all requests)

## Symptom

After a successful build, `node .output/server/index.mjs` crashes on every request:

```
TypeError: Cannot read properties of undefined (reading 'pathname')
    at startRequestResolver (.output/server/_ssr/index.mjs:1165:24)
```

## Root Cause

Stale hoisted `@tanstack/*` packages in `node_modules/@tanstack/` at version `1.158.0`, while the lockfile resolved `1.159.x`.

The API of `getNormalizedURL` changed between versions:
- **`1.158.0` (stale, hoisted):** `getNormalizedURL()` returns `{ url, handledProtocolRelativeURL }`
- **`1.159.4` (correct, in `.pnpm`):** `getNormalizedURL()` returns a plain `URL` object

The bundled SSR code used the `1.159.x` calling convention (`const { url, handledProtocolRelativeURL } = getNormalizedURL(...)`) but the bundled `router-core` shipped the `1.158.0` implementation that returns a plain `URL`. Destructuring `url` from a `URL` object yields `undefined`, hence the `pathname` crash.

Affected hoisted packages at wrong version:
- `router-core`, `start-server-core`, `start-client-core`
- `react-start-server`, `react-start-client`
- `router-devtools-core`, `router-generator`, `router-utils`

## Resolution

Delete `node_modules` and reinstall:

```bash
rm -rf node_modules
pnpm install
```

This cleared the stale hoisted copies. After reinstall, pnpm correctly resolved all `@tanstack/*` packages without version conflicts.

## Prevention

- After upgrading `@tanstack/react-start` or `@tanstack/react-router`, always do a clean install (`rm -rf node_modules && pnpm install`)
- If runtime errors appear in `@tanstack` code after an upgrade, check for version mismatches: `pnpm list @tanstack/router-core @tanstack/start-server-core`
- Consider using `pnpm dedupe` periodically to avoid duplicate package resolutions
