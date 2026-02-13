# SPA Mode (Static Client-Only Export)

TanStack Start supports a full static SPA mode where only `__root.tsx` is server-rendered into a shell HTML file. All child routes render entirely on the client.

## Step-by-Step Guide

### 1. Enable SPA mode

Add `spa` to the `tanstackStart()` plugin in `vite.config.ts`:

```ts
tanstackStart({
  spa: {
    enabled: true,
  },
}),
```

### 2. Build

```bash
pnpm build
```

This generates `_shell.html` and all static assets inside `.output/public/`.

### 3. Preview locally

```bash
pnpx http-server-spa .output/public _shell.html 3000
```

Or via Taskfile (if `preview:spa` task is configured):

```bash
task preview:spa
```

The Taskfile task definition:

```yaml
# Taskfile.yml
tasks:
  preview:spa:
    desc: Serve the SPA build locally using http-server-spa
    cmd: pnpx http-server-spa .output/public _shell.html ${PORT:-3000}
```

This serves `.output/public/` with `_shell.html` as the SPA fallback. Port defaults to `3000` (override via `PORT` env var).

### 4. Deploy

Deploy the contents of `.output/public/` to any static host or CDN. See [Deploying to a Static Host](#deploying-to-a-static-host) below.

## Configuration Options

```ts
tanstackStart({
  spa: {
    enabled: true,           // default: true when spa object is provided
    maskPath: '/',           // URL path used to generate the shell (default: '/')
    prerender: {
      outputPath: '/_shell', // output path for the shell HTML (default: '/_shell')
    },
  },
}),
```

## Deploying to a Static Host

Deploy the contents of `.output/public/` to any static host or CDN.

All non-asset requests must be rewritten to `/_shell.html` so client-side routing works:

| Host | Config |
|------|--------|
| Nginx | `try_files $uri $uri/ /_shell.html` |
| Netlify | `/* /_shell.html 200` in `_redirects` |
| Cloudflare Pages | `/* /_shell.html 200` in `_redirects` |
| Vercel | `"rewrites": [{ "source": "/(.*)", "destination": "/_shell.html" }]` in `vercel.json` |

## How It Works

1. During build, TanStack Start prerenders a shell page by fetching `maskPath` (`/`) with a `TSS_SHELL: 'true'` header
2. Only `__root.tsx` is SSR'd — all child routes are skipped
3. The shell HTML contains the layout, `<head>` tags, and `<script>` tags needed to bootstrap the client app
4. At runtime, the client-side router takes over and renders routes in the browser

## Caveats

- **Server functions** (`createServerFn()`) still require a running server. For a fully static deploy, avoid using them
- **`beforeLoad` / `loader`** run client-side only — no server data fetching
- **Dev mode** also respects SPA mode (`vite dev` sets `TSS_SHELL=true`)

## Alternative: Selective SSR

Instead of full SPA mode, you can disable SSR per-route or globally on the router:

```ts
// Global: disable SSR for all routes (still requires a server runtime)
createRouter({
  routeTree,
  defaultSsr: false,
})

// Per-route: disable SSR for a specific route
export const Route = createFileRoute('/dashboard')({
  ssr: false,
  component: Dashboard,
})
```

| | `spa: { enabled: true }` | `defaultSsr: false` |
|---|---|---|
| Static deploy | Yes (`_shell.html` + assets) | No (needs server) |
| Server functions | Need separate server | Available |
| Shell prerender | Yes | No |
