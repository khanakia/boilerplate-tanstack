# Docker Multi-Stage Deployment & DevOps Infrastructure

## Context

The project needs production-grade deployment infrastructure adapted from the Go project at `thewildai_chat_go`. Currently has basic Docker setup (`.docker/`) but lacks: secrets management, GitHub Actions CI/CD, review deployments for branch testing, `act` integration, and a `_keys` directory for credential files.

---

## Table of Contents

1. [Directory Structure](#directory-structure)
2. [How It All Works Together](#how-it-all-works-together)
3. [Secrets Management System](#secrets-management-system)
4. [Internal Endpoints (Version, Boot Info)](#internal-endpoints)
5. [Branch Deployment & Code Review System](#branch-deployment--code-review-system)
6. [Multi-Version / Multi-Port Deployment](#multi-version--multi-port-deployment)
7. [Docker Production Build](#docker-production-build)
8. [GitHub Actions CI/CD Pipeline](#github-actions-cicd-pipeline)
9. [Scripts CLI (TypeScript + Commander)](#scripts-cli)
10. [Taskfile Commands Reference](#taskfile-commands-reference)
11. [File-by-File Specification](#file-by-file-specification)
12. [Implementation Steps](#implementation-steps)
13. [Verification Checklist](#verification-checklist)

---

## Directory Structure

```
boilerplate_tanstack/
├── .docker/
│   ├── Dockerfile                     [EXISTS]  dev with hot reload
│   ├── Dockerfile.production          [REWRITE] 3-stage build, build args, non-root user, healthcheck
│   ├── docker-compose.yaml            [MODIFY]  env_file fix
│   └── Taskfile.yml                   [REWRITE] dev + prod + review + act tasks
│
├── .github/
│   ├── .secrets.prod                  [NEW] auto-generated secrets for prod (gitignored)
│   ├── .secrets.stag                  [NEW] auto-generated secrets for staging (gitignored)
│   └── workflows/
│       ├── deploy.yml.tmpl            [NEW] workflow template with [[ .VAR ]] placeholders (committed)
│       ├── deploy.prod.yml            [NEW] auto-generated prod workflow (gitignored)
│       └── deploy.stag.yml            [NEW] auto-generated staging workflow (gitignored)
│
├── _keys/
│   ├── .gitkeep                       [NEW] keeps directory in git
│   └── (your secret files)            e.g., nats.prod.pem, deploy.key
│
├── scripts/
│   ├── package.json                   [NEW] standalone TS project with commander, tsx
│   ├── tsconfig.json                  [NEW]
│   ├── Taskfile.yml                   [NEW]
│   └── src/
│       ├── index.ts                   [NEW] CLI entry point (commander)
│       ├── commands/
│       │   ├── secrets-update.ts      [NEW] build secrets + generate deploy.yml
│       │   ├── secrets-push.ts        [NEW] push to GitHub Environments
│       │   ├── secrets-read.ts        [NEW] display secret keys
│       │   ├── secrets-clean.ts       [NEW] remove orphan secrets from GitHub
│       │   ├── secrets-list.ts        [NEW] list available environments
│       │   ├── env-setup.ts           [NEW] full environment setup
│       │   ├── env-create.ts          [NEW] create GitHub Environment
│       │   ├── env-normalize.ts       [NEW] normalize branch name to env name
│       │   └── env-generate.ts        [NEW] generate .env.{env} from .env.example
│       └── lib/
│           ├── constants.ts           [NEW] paths, patterns, prefix
│           ├── keys.ts                [NEW] read key files, base64 encode
│           ├── secrets.ts             [NEW] extract GITHUB_SECRET_*, filter env, write
│           └── template.ts            [NEW] render deploy.yml.tmpl per environment
│
├── src/
│   ├── lib/
│   │   ├── buildinfo.ts               [NEW] build version info (set via env vars at build time)
│   │   └── bootinfo.ts                [NEW] boot status tracking for services (DB, Redis, etc.)
│   └── routes/
│       ├── api.health.ts              [NEW] health check endpoint for Docker
│       ├── api.version.ts             [NEW] public endpoint: returns build info
│       └── api.i.bootinfo.ts          [NEW] internal endpoint: returns boot status (guarded)
├── migrate.mjs                        [NEW] standalone Drizzle migration runner
├── .gitignore                         [MODIFY] add _keys/*, .secrets.*, deploy.*.yml
├── .dockerignore                      [MODIFY] exclude scripts, _keys, .github
├── .env.example                       [MODIFY] add GITHUB_SECRET_* examples
├── .env.prod                          [NEW] production config + GITHUB_SECRET_* vars (gitignored)
├── Taskfile.yml                       [MODIFY] add scripts include
└── vercel.json                        [NEW] Vercel deployment config
```

---

## How It All Works Together

### The Big Picture

```
┌──────────────────────────────────────────────────────────────────┐
│                        YOUR LOCAL MACHINE                         │
│                                                                   │
│  .env.prod  (single source of truth for prod)                    │
│  ┌────────────────────────────────────────────────────┐          │
│  │  # App config (goes to container)                  │          │
│  │  PORT=3000                                         │          │
│  │  DATABASE_URL=postgresql://...                     │          │
│  │  VITE_APP_URL=https://myapp.com                    │          │
│  │                                                    │          │
│  │  # GitHub secrets (goes to GitHub Actions)         │          │
│  │  GITHUB_SECRET_VPS_HOST=188.34.136.211             │          │
│  │  GITHUB_SECRET_VPS_USER=root                       │          │
│  │  GITHUB_SECRET_GHCR_PAT=ghp_abc123...             │          │
│  │  GITHUB_SECRET_CONTAINER_NAME=myapp                │          │
│  │  GITHUB_SECRET_DEPLOY_PATH=/opt/myapp              │          │
│  │  GITHUB_SECRET_KEY_FILES=["nats.prod.pem"]         │          │
│  └────────────────────────────────────────────────────┘          │
│        │                                                         │
│        ▼                                                         │
│  ┌─────────────────────────────────────────┐                     │
│  │  scripts CLI: gh:secrets:update         │                     │
│  │                                         │                     │
│  │  1. Read .env.prod                      │                     │
│  │  2. Extract GITHUB_SECRET_* vars        │                     │
│  │     → strip prefix → GitHub secrets     │                     │
│  │  3. Read GITHUB_SECRET_KEY_FILES        │                     │
│  │     → read each from _keys/             │                     │
│  │     → base64 encode → *_KEY_B64         │                     │
│  │  4. Filter .env.prod (remove            │                     │
│  │     GITHUB_SECRET_* lines)              │                     │
│  │     → base64 encode → ENV_B64           │                     │
│  │  5. Write .github/.secrets.prod         │                     │
│  │  6. Generate deploy.prod.yml            │                     │
│  │     from deploy.yml.tmpl                │                     │
│  └──────────────┬──────────────────────────┘                     │
│                 │                                                 │
│        ┌────────┴────────┐                                       │
│        ▼                 ▼                                        │
│  .github/          .github/workflows/                            │
│  .secrets.prod     deploy.prod.yml                               │
│  (auto-generated)  (auto-generated)                              │
│        │                                                         │
│        ▼                                                         │
│  ┌─────────────────────────────────────────┐                     │
│  │  scripts CLI: gh:secrets:push           │                     │
│  │  → gh secret set VPS_HOST --env prod    │                     │
│  │  → gh secret set GHCR_PAT --env prod    │                     │
│  │  → gh secret set ENV_B64 --env prod     │                     │
│  │  → gh secret set *_KEY_B64 --env prod   │                     │
│  └──────────────┬──────────────────────────┘                     │
└─────────────────│────────────────────────────────────────────────┘
                  │
                  ▼
         ┌────────────────────┐
         │  GitHub             │
         │  ├── Environment:   │
         │  │   "prod"         │
         │  │   ├── VPS_HOST   │
         │  │   ├── GHCR_PAT   │
         │  │   ├── ENV_B64    │
         │  │   └── *_KEY_B64  │
         │  │                  │
         │  └── Workflow:      │
         │      deploy.prod.yml│
         └────────┬───────────┘
                  │  (git push to main)
                  ▼
         ┌────────────────────┐
         │  GitHub Actions     │
         │  Job 1: Build       │
         │  → Docker image     │
         │  → Push to ghcr.io  │
         │                     │
         │  Job 2: Deploy      │
         │  → SSH to VPS       │
         │  → Decode ENV_B64   │
         │    → .env.prod      │
         │  → Decode *_KEY_B64 │
         │    → _keys/ files   │
         │  → docker pull      │
         │  → docker run       │
         └────────┬───────────┘
                  │
                  ▼
         ┌────────────────────┐
         │  VPS Server         │
         │  /opt/myapp/        │
         │  ├── .env.prod      │  ← decoded from ENV_B64
         │  ├── _keys/         │  ← decoded from *_KEY_B64
         │  │   └── nats.pem   │
         │  └── logs/          │
         │                     │
         │  Container: myapp   │
         │  Port: 3000         │
         └────────────────────┘
```

### Multi-Environment Support

The system supports **any number of environments**. Each environment is just a `.env.{name}` file.

```
.env.prod   → push to main   → GitHub Environment "prod"   → deploy.prod.yml
.env.stag   → push to stag   → GitHub Environment "stag"   → deploy.stag.yml
.env.dev    → push to dev    → GitHub Environment "dev"     → deploy.dev.yml
```

The CLI auto-discovers all `.env.*` files and can process them all at once or individually:

```bash
# Process all environments
pnpm tsx src/index.ts gh:secrets:update

# Process specific environment
pnpm tsx src/index.ts gh:secrets:update --env=prod
```

### How PORT Flows Through The System

```
Dockerfile.production:
  ENV PORT=3000  ← default, overridden at runtime

Case 1: Production VPS (--network host)
  .env.prod has PORT=3000
  docker run --network host --env-file .env.prod ...
  → Container listens directly on VPS port 3000
  → No -p flag needed (host networking)

Case 2: Local prod test
  .env.prod has PORT=3000
  docker run -p 3000:3000 --env-file .env.prod ...
  → Host port 3000 maps to container port 3000

Case 3: Review deployment on different port
  docker run -p 3010:3010 -e PORT=3010 --env-file .env.prod ...
  → The -e PORT=3010 OVERRIDES .env.prod's PORT
  → Container listens on 3010 inside
  → Host port 3010 maps to container port 3010
  → Access at http://localhost:3010

Case 4: Multiple reviews simultaneously
  review-feature-auth:       -p 3010:3010 -e PORT=3010
  review-fix-header:         -p 3011:3011 -e PORT=3011
  review-new-dashboard:      -p 3012:3012 -e PORT=3012
  → Each container has its own port, all accessible at once
```

---

## Secrets Management System

### How It Works (Exact Port of Go Project)

The Go project (`thewildai_chat_go/scripts/internal/pkg/secrets_build/secrets_build.go`) uses this pattern:

**Single source of truth: `.env.{env}` files contain EVERYTHING.**

Inside `.env.prod`, you have both app config and GitHub secrets:

```bash
# ═══════════════════════════════════════
# App config (deployed to container)
# ═══════════════════════════════════════
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/db
VITE_APP_URL=https://myapp.com
NODE_ENV=production

# ═══════════════════════════════════════
# GitHub secrets (prefixed with GITHUB_SECRET_)
# These are STRIPPED from the container's env file
# and pushed to GitHub Environments instead
# ═══════════════════════════════════════
GITHUB_SECRET_GITHUB_ACTOR=myorg

# Only needed for `act` local testing, not pushed to GitHub
GITHUB_SECRET_GITHUB_TOKEN=ghp_abc123

# VPS Access
GITHUB_SECRET_VPS_HOST=188.34.136.211
GITHUB_SECRET_VPS_USER=root
GITHUB_SECRET_VPS_PORT=22
GITHUB_SECRET_VPS_SSH_KEY="-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmU...
-----END OPENSSH PRIVATE KEY-----"

# GitHub Container Registry
GITHUB_SECRET_GHCR_PAT=ghp_abc123

# Container Settings
GITHUB_SECRET_CONTAINER_NAME=boilerplate-tanstack
GITHUB_SECRET_DEPLOY_PATH=/opt/boilerplate-tanstack

# Key files to include (JSON array of filenames in _keys/)
GITHUB_SECRET_KEY_FILES=["nats-server.prod.pem", "service-account.prod.json"]
```

### What Happens When You Run `gh:secrets:update`

```bash
task scripts:gh:secrets:update --env=prod
```

**Step 1: Read `.env.prod`**

Parses the entire file with dotenv.

**Step 2: Extract `GITHUB_SECRET_*` variables**

Finds all keys prefixed with `GITHUB_SECRET_`, strips the prefix:

```
GITHUB_SECRET_VPS_HOST=188.34.136.211      → VPS_HOST=188.34.136.211
GITHUB_SECRET_VPS_USER=root                → VPS_USER=root
GITHUB_SECRET_GHCR_PAT=ghp_abc123         → GHCR_PAT=ghp_abc123
GITHUB_SECRET_CONTAINER_NAME=myapp         → CONTAINER_NAME=myapp
GITHUB_SECRET_DEPLOY_PATH=/opt/myapp       → DEPLOY_PATH=/opt/myapp
```

**Step 3: Process `GITHUB_SECRET_KEY_FILES`**

The special key `GITHUB_SECRET_KEY_FILES` contains a JSON array of filenames in `_keys/`:

```
GITHUB_SECRET_KEY_FILES=["nats-server.prod.pem", "service-account.prod.json"]
```

For each file:
1. Read from `_keys/nats-server.prod.pem`
2. Base64 encode the content
3. Generate secret name: `nats-server.prod.pem` → remove extension → uppercase → hyphens/dots to underscores → add `_KEY_B64`
   - `nats-server.prod.pem` → `NATS_SERVER_PROD_KEY_B64`
   - `service-account.prod.json` → `SERVICE_ACCOUNT_PROD_KEY_B64`

**Step 4: Create `ENV_B64`**

Read `.env.prod` again but FILTER OUT all `GITHUB_SECRET_*` lines (including multiline values like SSH keys). Base64 encode the filtered content:

```
Filtered .env.prod (what goes into the container):
  PORT=3000
  DATABASE_URL=postgresql://user:pass@host:5432/db
  VITE_APP_URL=https://myapp.com
  NODE_ENV=production

→ base64 encode → ENV_B64="UE9SVD0zMDAwCkRBVEFC..."
```

**Step 5: Write `.github/.secrets.prod`**

Combines everything into a single auto-generated file:

```bash
# Code generated by scripts CLI, DO NOT EDIT
CONTAINER_NAME="boilerplate-tanstack"
DEPLOY_PATH="/opt/boilerplate-tanstack"
ENV_B64="UE9SVD0zMDAwCkRBVEFC..."
GHCR_PAT="ghp_abc123"
GITHUB_ACTOR="myorg"
GITHUB_TOKEN="ghp_abc123"
NATS_SERVER_PROD_KEY_B64="LS0tLS1CRUdJTi..."
SERVICE_ACCOUNT_PROD_KEY_B64="eyJhY2NvdW50..."
VPS_HOST="188.34.136.211"
VPS_PORT="22"
VPS_SSH_KEY="-----BEGIN OPENSSH PRIVATE KEY-----..."
VPS_USER="root"
```

**Step 6: Generate `deploy.prod.yml` from template**

Read `deploy.yml.tmpl`, fill in environment-specific data:

```
Template variable     → Value for prod
[[ .Name ]]           → prod
[[ .NameUpper ]]      → PROD
[[ .Branch ]]         → main  (prod maps to main, others use env name as branch)
[[ .EnvVarName ]]     → ENV_B64
```

Writes to `.github/workflows/deploy.prod.yml`.

### Pushing to GitHub

```bash
task scripts:gh:secrets:push --env=prod
```

Reads `.github/.secrets.prod`, pushes each key to **GitHub Environment** "prod":

```bash
# For each secret:
echo "value" | gh secret set VPS_HOST --env prod
echo "value" | gh secret set GHCR_PAT --env prod
echo "value" | gh secret set ENV_B64 --env prod
echo "value" | gh secret set NATS_SERVER_PROD_KEY_B64 --env prod
...

# Note: GITHUB_* prefixed secrets are SKIPPED (reserved by GitHub)
# GITHUB_ACTOR and GITHUB_TOKEN are only for `act` local testing
```

### Why GitHub Environments (Not Repo Secrets)?

GitHub Environments provide:
- **Isolation**: Each environment (prod, staging, dev) has its own secrets
- **Protection rules**: Require reviewers before deploying to prod
- **Deployment history**: Track what was deployed when
- **Different values**: Same key name, different values per environment

### What Happens on the VPS During Deployment

The deploy workflow SSHs to VPS and:

```bash
# 1. Decode ENV_B64 back to .env file (clean, no GITHUB_SECRET_ lines)
echo "${ENV_B64}" | base64 -d > /opt/myapp/.env.prod

# 2. The container uses this clean .env file
docker run --env-file /opt/myapp/.env.prod ...
```

The container never sees `GITHUB_SECRET_*` variables - they're stripped out.

### Key Files Flow

```
Local:                          GitHub:                    VPS:
_keys/nats-server.prod.pem  →  NATS_SERVER_PROD_KEY_B64  →  /opt/myapp/_keys/nats-server.prod.pem
  (original file)               (base64 in GitHub Secret)    (decoded back to original file)
```

### `.env.example` with GITHUB_SECRET_ documentation

```bash
# ═══════════════════════════════════════
# App Configuration
# ═══════════════════════════════════════
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
VITE_APP_URL=http://localhost:3000

# ═══════════════════════════════════════
# GitHub Secrets (for CI/CD deployment)
# Prefix: GITHUB_SECRET_
# These are extracted by scripts CLI and pushed to GitHub Environments.
# They are NOT included in the container's env file.
# ═══════════════════════════════════════

# GitHub actor (for container registry)
GITHUB_SECRET_GITHUB_ACTOR=your-github-username

# Only for `act` local testing (GitHub auto-generates this in Actions)
GITHUB_SECRET_GITHUB_TOKEN=ghp_your_token

# VPS Access
GITHUB_SECRET_VPS_HOST=your-vps-ip
GITHUB_SECRET_VPS_USER=root
GITHUB_SECRET_VPS_PORT=22
GITHUB_SECRET_VPS_SSH_KEY="-----BEGIN OPENSSH PRIVATE KEY-----
your-key-here
-----END OPENSSH PRIVATE KEY-----"

# GitHub Container Registry PAT
GITHUB_SECRET_GHCR_PAT=ghp_your_pat

# Container Settings
GITHUB_SECRET_CONTAINER_NAME=boilerplate-tanstack
GITHUB_SECRET_DEPLOY_PATH=/opt/boilerplate-tanstack

# Key files (JSON array of filenames in _keys/ directory)
# Each file is base64-encoded and pushed as a GitHub secret
# On VPS, they're decoded back into the _keys/ directory
GITHUB_SECRET_KEY_FILES=[]
```

---

## Internal Endpoints

Ported from the Go project's `lace/buildinfo`, `lace/bootinfo`, and `ginserver.MiddlewareInternalApiGuard`.

### Three Endpoints

| Endpoint | Access | Purpose |
|----------|--------|---------|
| `/api/health` | Public | Docker health check. Returns `{ status: "ok" }`. Used by `HEALTHCHECK` in Dockerfile. |
| `/api/version` | Public | Build info. Returns version, commit, branch, build time. Used to verify which version is running. |
| `/api/i/bootinfo` | Internal (guarded) | Boot status of all services (DB, etc.). Protected by `x-internal-key` header. |

### How It Works in the Go Project

```
/api/version         → buildinfo.Info()        → { version, commit, branch, build_time }
/api/i/bootinfo      → bootinfo.GetBootInfo()  → { db: { status, error }, redis: { status, error }, ... }
                       ↑ protected by MiddlewareInternalApiGuard(config.Core.InternalKey)
                       ↑ requires header: x-internal-key=your-secret-key
```

### Our Implementation (TanStack Start)

#### `src/lib/buildinfo.ts` - Build Version Info

```typescript
// Build info set at compile time via VITE_ env vars in Dockerfile
// These are baked into the build output during `pnpm build`
export function getBuildInfo() {
  return {
    version: process.env.VITE_APP_VERSION || 'dev',
    commit: process.env.VITE_APP_COMMIT || 'unknown',
    branch: process.env.VITE_APP_BRANCH || 'unknown',
    buildTime: process.env.VITE_APP_BUILD_TIME || 'unknown',
  }
}
```

#### `src/lib/bootinfo.ts` - Boot Status Tracking

```typescript
// Tracks the boot status of services (DB connection, Redis, NATS, etc.)
// Services register their status during app startup
// The /api/i/bootinfo endpoint returns this info for debugging

interface ServiceStatus {
  status: 'ok' | 'error' | 'not_configured'
  error?: string
  message?: string
  timestamp: string
  metadata?: Record<string, unknown>
}

type BootInfo = Record<string, ServiceStatus>

const globalBootInfo: BootInfo = {}

export function setServiceStatus(
  serviceName: string,
  status: Omit<ServiceStatus, 'timestamp'>
) {
  globalBootInfo[serviceName] = {
    ...status,
    timestamp: new Date().toISOString(),
  }
}

export function getBootInfo(): BootInfo {
  return globalBootInfo
}

// Call this during app startup to register service statuses
// Example usage in db/index.ts:
//   import { setServiceStatus } from '@/lib/bootinfo'
//   try {
//     await db.execute(sql`SELECT 1`)
//     setServiceStatus('database', { status: 'ok', message: 'Connected' })
//   } catch (e) {
//     setServiceStatus('database', { status: 'error', error: e.message })
//   }
```

#### `src/routes/api.version.ts` - Public Version Endpoint

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getBuildInfo } from '@/lib/buildinfo'

export const Route = createFileRoute('/api/version')({
  server: {
    handlers: {
      GET: () => json(getBuildInfo()),
    },
  },
})
```

Response:
```json
{
  "version": "v1.2.3",
  "commit": "abc1234",
  "branch": "main",
  "buildTime": "2026-02-13T10:30:00Z"
}
```

#### `src/routes/api.i.bootinfo.ts` - Internal Boot Info Endpoint

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getBootInfo } from '@/lib/bootinfo'

export const Route = createFileRoute('/api/i/bootinfo')({
  server: {
    handlers: {
      GET: ({ request }) => {
        // Internal API guard: require x-internal-key header
        const internalKey = request.headers.get('x-internal-key')
        const expectedKey = process.env.INTERNAL_KEY

        if (!expectedKey) {
          return json({ error: 'INTERNAL_KEY not configured' }, { status: 500 })
        }

        if (!internalKey || internalKey !== expectedKey) {
          return json({ error: 'unauthorized, invalid internal key' }, { status: 401 })
        }

        return json(getBootInfo())
      },
    },
  },
})
```

Access: `curl -H "x-internal-key=YOUR_KEY" http://localhost:3000/api/i/bootinfo`

Response:
```json
{
  "database": {
    "status": "ok",
    "message": "Connected to PostgreSQL",
    "timestamp": "2026-02-13T10:30:00Z"
  },
  "sentry": {
    "status": "ok",
    "message": "DSN configured",
    "timestamp": "2026-02-13T10:30:00Z"
  }
}
```

#### `src/routes/api.health.ts` - Docker Health Check

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: () => json({ status: 'ok', timestamp: new Date().toISOString() }),
    },
  },
})
```

This is intentionally minimal - health checks should be fast and not depend on external services.

### New Environment Variables

Add to `.env.example` and `.env.prod`:

```bash
# Internal API key for protected endpoints (/api/i/*)
INTERNAL_KEY=your-random-secret-key-here
```

### Registering Service Status at Boot

In your DB initialization (`src/db/index.ts` or similar), add:

```typescript
import { setServiceStatus } from '@/lib/bootinfo'

// After DB connection:
try {
  // test connection
  setServiceStatus('database', { status: 'ok', message: 'PostgreSQL connected' })
} catch (error) {
  setServiceStatus('database', { status: 'error', error: error.message })
}
```

---

## Branch Deployment & Code Review System

### The Problem

You do code reviews. Each developer pushes to a different branch. You need to:
1. Pull their branch
2. Build it
3. Run it to test
4. Do this for multiple branches simultaneously
5. Clean up when done

### End-to-End Workflow

#### Scenario: Developer pushes `feature/user-auth` branch

**Step 1: Build an image from the branch**

```bash
# Fetch latest branches
git fetch origin

# Build Docker image from the feature branch
task docker:review:build BRANCH=feature/user-auth
```

What happens under the hood:
```bash
# 1. Save current branch name
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# 2. Checkout the target branch
git checkout feature/user-auth

# 3. Build Docker production image tagged with sanitized branch name
#    feature/user-auth → feature-user-auth
docker build \
  --build-arg VERSION=feature/user-auth \
  --build-arg COMMIT=$(git rev-parse --short HEAD) \
  --build-arg BRANCH=feature/user-auth \
  --build-arg BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
  -t boilerplate-tanstack:review-feature-user-auth \
  -f .docker/Dockerfile.production .

# 4. Return to previous branch
git checkout $CURRENT_BRANCH
```

**Step 2: Start the review container on a specific port**

```bash
task docker:review:up BRANCH=feature/user-auth PORT=3010
```

What happens:
```bash
# Stop existing container for this branch (if any)
docker stop review-feature-user-auth 2>/dev/null || true
docker rm review-feature-user-auth 2>/dev/null || true

# Run with explicit PORT override and Docker labels for tracking
docker run -d \
  --name review-feature-user-auth \
  --restart unless-stopped \
  -p 3010:3010 \
  -e PORT=3010 \
  -e NODE_ENV=production \
  --env-file .env.prod \
  -v $(pwd)/_keys:/app/_keys:ro \
  --label "review=true" \
  --label "review.branch=feature/user-auth" \
  --label "review.port=3010" \
  boilerplate-tanstack:review-feature-user-auth
```

**Step 3: Test the branch**

```
Browser:  http://localhost:3010
Health:   curl http://localhost:3010/api/health
→ { "status": "ok", "version": "feature/user-auth", "commit": "abc1234" }
```

**Step 4: Review another branch simultaneously**

```bash
task docker:review:build BRANCH=fix/header-bug
task docker:review:up BRANCH=fix/header-bug PORT=3011

# Now you have:
#   http://localhost:3010 → feature/user-auth
#   http://localhost:3011 → fix/header-bug
```

**Step 5: List all running reviews**

```bash
task docker:review:list
```

Output:
```
NAMES                        STATUS          PORTS                    BRANCH
review-feature-user-auth     Up 2 hours      0.0.0.0:3010->3010/tcp   feature/user-auth
review-fix-header-bug        Up 5 minutes    0.0.0.0:3011->3011/tcp   fix/header-bug
```

**Step 6: Clean up**

```bash
# Stop specific review
task docker:review:down BRANCH=feature/user-auth

# Stop ALL reviews at once
task docker:review:down:all
```

### Remote VPS Review

Deploy to VPS so team members can access:

```bash
# Build locally, tag, and push to registry
task docker:review:build BRANCH=feature/user-auth
docker tag boilerplate-tanstack:review-feature-user-auth ghcr.io/yourorg/repo:review-feature-user-auth
docker push ghcr.io/yourorg/repo:review-feature-user-auth

# Deploy to VPS on specific port
task docker:review:up:remote \
  BRANCH=feature/user-auth \
  PORT=3010 \
  VPS_HOST=188.34.136.211 \
  IMAGE=ghcr.io/yourorg/repo:review-feature-user-auth
```

Team can access: `http://188.34.136.211:3010`

### Review Container Tracking

Docker labels are the source of truth - no database needed:

```
Every review container gets:
  --label "review=true"                       ← marks as review
  --label "review.branch=feature/user-auth"   ← which branch
  --label "review.port=3010"                  ← which port

List reviews:
  docker ps --filter "label=review=true"

Stop all reviews:
  docker rm -f $(docker ps -q --filter "label=review=true")
```

### Port Convention

```
Production:     3000  (from .env.prod)
Staging:        3001  (from .env.stag)
Reviews:        3010-3099 (manually assigned)
```

---

## Multi-Version / Multi-Port Deployment

### Running Multiple Versions on Same VPS

```
VPS Server (188.34.136.211)
├── Production (main branch)
│   ├── Container: boilerplate-tanstack
│   ├── Port: 3000 (from .env.prod)
│   ├── Env: /opt/myapp/.env.prod
│   └── Image: ghcr.io/org/repo:prod-latest
│
├── Staging (stag branch)
│   ├── Container: boilerplate-tanstack-stag
│   ├── Port: 3001 (from .env.stag)
│   ├── Env: /opt/myapp-stag/.env.stag
│   └── Image: ghcr.io/org/repo:stag-latest
│
├── Review: feature/user-auth
│   ├── Container: review-feature-user-auth
│   ├── Port: 3010
│   └── Image: ghcr.io/org/repo:review-feature-user-auth
│
└── Review: fix/header-bug
    ├── Container: review-fix-header-bug
    ├── Port: 3011
    └── Image: ghcr.io/org/repo:review-fix-header-bug
```

### How Each Environment Deploys

**Production** - automatic via GitHub Actions:
```
git push origin main → deploy.prod.yml triggers → builds, pushes, deploys on port 3000
```

**Staging** - automatic via GitHub Actions:
```
git push origin stag → deploy.stag.yml triggers → builds, pushes, deploys on port 3001
```

**Reviews** - manual via Taskfile:
```
task docker:review:build BRANCH=feature-x
task docker:review:up BRANCH=feature-x PORT=3010
```

---

## Docker Production Build

### 3-Stage Multi-Stage Dockerfile

```
Stage 1: deps (dependency caching)
  FROM node:22-alpine
  → Install pnpm
  → Copy package.json + pnpm-lock.yaml ONLY
  → pnpm install --frozen-lockfile
  ✓ Cached when dependencies don't change

Stage 2: builder (application build)
  FROM node:22-alpine
  → Copy node_modules from deps stage
  → Copy all source code
  → Build args: VERSION, COMMIT, BRANCH, BUILD_TIME
  → SKIP_ENV_VALIDATION=1 (no env vars at build time)
  → pnpm build → .output/

Stage 3: runner (minimal production image)
  FROM node:22-alpine
  → curl (for health check)
  → Non-root user (appuser, UID 1001)
  → /app/_keys and /app/logs directories
  → Copy .output/, drizzle/, migrate.mjs from builder
  → HEALTHCHECK at /api/health every 30s
  → CMD: node .output/server/index.mjs
```

### Build Args (Version Tracking)

```bash
docker build \
  --build-arg VERSION=$(git describe --tags 2>/dev/null || echo "dev") \
  --build-arg COMMIT=$(git rev-parse --short HEAD) \
  --build-arg BRANCH=$(git rev-parse --abbrev-ref HEAD) \
  --build-arg BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ) ...
```

These become VITE_ env vars baked into the build. The `/api/health` endpoint returns them:

```json
{
  "status": "ok",
  "version": "v1.2.3",
  "commit": "abc1234",
  "branch": "main",
  "buildTime": "2026-02-13T10:30:00Z"
}
```

---

## GitHub Actions CI/CD Pipeline

### deploy.yml.tmpl (Template)

Uses Go-style `[[ .Var ]]` delimiters (same as Go project) to avoid `${{ }}` conflicts:

```yaml
# Template variables filled per-environment:
[[ .Name ]]       → prod, stag, dev, etc.
[[ .NameUpper ]]  → PROD, STAG, DEV, etc.
[[ .Branch ]]     → main (for prod), stag (for stag), etc.
[[ .EnvVarName ]] → ENV_B64
```

### Generated Workflow Structure

Each `deploy.{env}.yml` has two jobs:

**Job 1: build-and-push** (skippable via `skip_build` input)
```
1. Checkout code
2. Setup QEMU + Docker Buildx
3. Login to ghcr.io
4. Tag as: {env}-{sha}, {env}-latest
5. Build + push with VERSION/COMMIT/BRANCH/BUILD_TIME args
```

**Job 2: deploy** (runs after build, or if build was skipped)
```
1. Decode VPS_DEPLOY_KEY_B64 → SSH key
2. SSH to VPS via appleboy/ssh-action
3. Create directories: _keys/, logs/
4. Decode ENV_B64 → .env.{env} (clean, no GITHUB_SECRET_ lines)
5. Login to ghcr.io, pull image
6. Stop old container, start new one:
   docker run -d --network host --env-file .env.{env} \
     -v _keys:/app/_keys:ro -v logs:/app/logs ...
7. Run migrations
8. Prune old images
```

### Using `act` for Local Testing

```bash
task docker:act:list           # List workflow jobs
task docker:act:dry            # Dry run
task docker:act:build-push     # Test build job (reads .github/.secrets.prod)
task docker:act:deploy         # Test deploy job
task docker:act:full           # Full workflow
```

`act` reads secrets from `.github/.secrets.{env}` - the same auto-generated file.

---

## Scripts CLI

### Architecture

```
scripts/
├── package.json          ← commander, dotenv, tsx
├── tsconfig.json
├── Taskfile.yml
└── src/
    ├── index.ts          ← CLI entry: registers all commands
    ├── commands/
    │   ├── secrets-update.ts    ← Main: read .env, extract, encode, write, generate
    │   ├── secrets-push.ts      ← Push to GitHub Environments
    │   ├── secrets-read.ts      ← Display secret keys (values hidden)
    │   ├── secrets-clean.ts     ← Remove orphan secrets from GitHub
    │   ├── secrets-list.ts      ← List available environments
    │   ├── env-setup.ts         ← Full setup: create env + build + push + generate
    │   ├── env-create.ts        ← Create GitHub Environment
    │   ├── env-normalize.ts     ← Normalize branch → env name
    │   └── env-generate.ts      ← Generate .env.{env} from .env.example
    └── lib/
        ├── constants.ts  ← GITHUB_SECRET_ prefix, paths, patterns
        ├── keys.ts       ← processKeyFiles(): read from _keys/, base64 encode
        ├── secrets.ts    ← buildAndUpdateSecrets(): extract, filter, write
        └── template.ts   ← createGithubDeployYaml(): render per-env from template
```

### All CLI Commands (Matching Go Project)

```bash
# All commands support --env flag. Without it, processes ALL environments.

# List available environments (scans for .env.* files)
pnpm tsx src/index.ts gh:secrets:list

# Build secrets and generate deploy.yml
pnpm tsx src/index.ts gh:secrets:update              # all environments
pnpm tsx src/index.ts gh:secrets:update --env=prod   # prod only

# Push secrets to GitHub Environments
pnpm tsx src/index.ts gh:secrets:push                # all
pnpm tsx src/index.ts gh:secrets:push --env=prod     # prod only

# Read secret keys (values hidden)
pnpm tsx src/index.ts gh:secrets:read --env=prod

# Clean orphan secrets from GitHub
pnpm tsx src/index.ts gh:secrets:clean --env=prod

# Full environment setup (create + build + push + generate)
pnpm tsx src/index.ts gh:env:setup --env=prod

# Create GitHub Environment
pnpm tsx src/index.ts gh:env:create --env=staging

# Normalize branch name to environment name
pnpm tsx src/index.ts gh:env:normalize feature/test
# → feature-test

# Generate .env.{env} from .env.example
pnpm tsx src/index.ts env:generate --env=prod
```

### Key Functions (Ported from Go)

**`buildAndUpdateSecrets(env)`** - Core function:
```typescript
1. Read .env.{env} with dotenv
2. Extract GITHUB_SECRET_* vars (strip prefix)
3. Handle GITHUB_SECRET_KEY_FILES (JSON array → read + base64 each)
4. Filter .env.{env} removing GITHUB_SECRET_* lines → base64 → ENV_B64
5. Write all to .github/.secrets.{env}
6. Render deploy.yml.tmpl → deploy.{env}.yml
```

**`filterEnvFileForDeployment(envFile)`** - Strips GITHUB_SECRET_ lines:
```typescript
// Reads .env file line by line
// Skips GITHUB_SECRET_* lines (including multiline values like SSH keys)
// Returns clean env content for the container
```

**`processKeyFiles(keyFilesJSON)`** - Handles key files:
```typescript
// Parses JSON array: ["nats.prod.pem", "deploy.key"]
// For each: reads from _keys/, base64 encodes
// Returns: [{ key: "NATS_PROD_KEY_B64", value: "base64..." }]
```

**`createGithubDeployYaml(envs)`** - Template rendering:
```typescript
// Reads deploy.yml.tmpl
// For each env, replaces [[ .Name ]], [[ .Branch ]], etc.
// Writes deploy.{env}.yml
// prod → branch "main", everything else → branch = env name
```

**`pushSecretsToGithubEnvironment(env)`** - GitHub push:
```typescript
// Reads .github/.secrets.{env}
// Skips GITHUB_* prefixed keys (reserved by GitHub)
// For each: execSync(`gh secret set ${key} --env ${env}`, { input: value })
```

---

## Taskfile Commands Reference

```bash
# ═══════════════════════════════════════
# DEVELOPMENT
# ═══════════════════════════════════════
task docker:up              # Start dev container (hot reload)
task docker:down            # Stop dev container
task docker:up:force        # Force rebuild and restart
task docker:rebuild         # Rebuild without cache
task docker:logs            # Stream dev logs
task docker:ps              # Show status

# ═══════════════════════════════════════
# PRODUCTION BUILD & RUN
# ═══════════════════════════════════════
task docker:prod:build                  # Build prod image with git version info
task docker:prod:build VERSION=v1.2.3   # Build with specific version
task docker:prod:build:nocache          # Build without cache
task docker:prod:run                    # Run prod locally (PORT from .env.prod)
task docker:prod:stop                   # Stop prod container
task docker:prod:logs                   # Stream prod logs
task docker:prod:shell                  # Open shell in container

# ═══════════════════════════════════════
# REVIEW / CODE REVIEW DEPLOYMENTS
# ═══════════════════════════════════════
task docker:review:build BRANCH=feature/auth       # Build image from branch
task docker:review:up BRANCH=feature/auth PORT=3010  # Start review container
task docker:review:down BRANCH=feature/auth          # Stop review container
task docker:review:down:all                          # Stop ALL reviews
task docker:review:list                              # List running reviews

# Remote VPS review:
task docker:review:up:remote BRANCH=feature/auth PORT=3010 VPS_HOST=1.2.3.4 IMAGE=ghcr.io/org/repo:tag
task docker:review:down:remote BRANCH=feature/auth VPS_HOST=1.2.3.4

# ═══════════════════════════════════════
# GITHUB ACTIONS LOCAL TESTING (act)
# ═══════════════════════════════════════
task docker:act:list           # List jobs
task docker:act:dry            # Dry run
task docker:act:build-push     # Test build job
task docker:act:deploy         # Test deploy job
task docker:act:full           # Full workflow

# ═══════════════════════════════════════
# SECRETS & ENVIRONMENT MANAGEMENT
# ═══════════════════════════════════════
task scripts:gh:secrets:list                    # List environments
task scripts:gh:secrets:update                  # All envs
task scripts:gh:secrets:update -- --env=prod    # Prod only
task scripts:gh:secrets:push                    # Push all
task scripts:gh:secrets:push -- --env=prod      # Push prod
task scripts:gh:secrets:read -- --env=prod      # Read keys
task scripts:gh:secrets:clean -- --env=prod     # Clean orphans
task scripts:gh:env:setup -- --env=prod         # Full setup
task scripts:gh:env:create -- --env=staging     # Create env
task scripts:env:generate -- --env=prod         # Generate .env
```

---

## File-by-File Specification

### `.docker/Dockerfile.production`

```dockerfile
# Stage 1: Dependencies
FROM node:22-alpine AS deps
RUN npm i -g pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

# Stage 2: Builder
FROM node:22-alpine AS builder
RUN npm i -g pnpm
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG VERSION=dev COMMIT=unknown BRANCH=unknown BUILD_TIME=unknown
ENV VITE_APP_VERSION=${VERSION} VITE_APP_COMMIT=${COMMIT}
ENV VITE_APP_BRANCH=${BRANCH} VITE_APP_BUILD_TIME=${BUILD_TIME}
ENV SKIP_ENV_VALIDATION=1
RUN pnpm build

# Stage 3: Runner
FROM node:22-alpine AS runner
RUN apk add --no-cache curl
RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -D appuser
WORKDIR /app
RUN mkdir -p /app/_keys /app/logs && chown -R appuser:appgroup /app
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/migrate.mjs ./migrate.mjs
RUN chown -R appuser:appgroup /app
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
EXPOSE ${PORT}
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/health || exit 1
USER appuser
CMD ["node", "--import", "./.output/server/instrument.server.mjs", ".output/server/index.mjs"]
```

### `src/routes/api.health.ts`

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: () => json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.VITE_APP_VERSION || 'dev',
        commit: process.env.VITE_APP_COMMIT || 'unknown',
        branch: process.env.VITE_APP_BRANCH || 'unknown',
        buildTime: process.env.VITE_APP_BUILD_TIME || 'unknown',
      }),
    },
  },
})
```

### `migrate.mjs`

```javascript
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'

const db = drizzle(process.env.DATABASE_URL)
await migrate(db, { migrationsFolder: './drizzle' })
console.log('Migrations complete')
process.exit(0)
```

### `scripts/src/lib/constants.ts`

```typescript
export const GITHUB_SECRET_PREFIX = 'GITHUB_SECRET_'
export const GITHUB_SECRET_KEY_FILES = 'GITHUB_SECRET_KEY_FILES'
```

### `scripts/src/lib/secrets.ts` (Core Logic)

```typescript
// buildAndUpdateSecrets(env: string)
//   1. godotenv.read(`.env.${env}`)
//   2. for each key starting with GITHUB_SECRET_:
//        if key === GITHUB_SECRET_KEY_FILES → processKeyFiles(value)
//        else → { key: stripPrefix(key), value }
//   3. filterEnvFileForDeployment(`.env.${env}`) → base64 → ENV_B64
//   4. writeSecrets(secrets, `.github/.secrets.${env}`)

// filterEnvFileForDeployment(envFile: string)
//   Reads file line by line
//   Skips lines starting with GITHUB_SECRET_
//   Handles multiline values (SSH keys in quotes)
//   Returns clean string

// writeSecrets(secrets: Secret[], path: string)
//   Sorts alphabetically
//   Writes: KEY="value" format
//   Header: # Code generated by scripts CLI, DO NOT EDIT
```

### `scripts/src/lib/keys.ts`

```typescript
// processKeyFiles(keyFilesJSON: string)
//   JSON.parse(keyFilesJSON) → ["nats.pem", "deploy.key"]
//   For each filename:
//     Read _keys/{filename}
//     base64 encode content
//     Generate name: remove ext → uppercase → replace -/. with _ → add _KEY_B64
//   Return: Secret[]
```

### `scripts/src/lib/template.ts`

```typescript
// createGithubDeployYaml(envs: string[])
//   Read deploy.yml.tmpl
//   For each env:
//     data = { Name: env, NameUpper: env.toUpperCase(), Branch: getBranch(env), EnvVarName: "ENV_B64" }
//     Replace [[ .Name ]] → env, [[ .Branch ]] → branch, etc.
//     Write deploy.{env}.yml
//
// getBranch(env): prod → "main", everything else → env name
```

### `.github/workflows/deploy.yml.tmpl`

```yaml
name: Deploy [[ .Name ]]
on:
  push:
    branches: [[[ .Branch ]]]
  workflow_dispatch:
    inputs:
      skip_build:
        description: 'Skip build and deploy existing latest image'
        type: boolean
        default: false

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}
  ENVIRONMENT: [[ .Name ]]

jobs:
  build-and-push:
    if: ${{ github.event.inputs.skip_build != 'true' }}
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      # ... checkout, QEMU, Buildx, login, metadata, build+push
      # Tags: [[ .Name ]]-{sha}, [[ .Name ]]-latest

  deploy:
    needs: build-and-push
    if: always() && (needs.build-and-push.result == 'success' || needs.build-and-push.result == 'skipped')
    runs-on: ubuntu-latest
    environment: [[ .Name ]]
    steps:
      # ... decode SSH key, SSH to VPS, decode ENV_B64, pull image, run container
```

### `vercel.json`

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "pnpm build",
  "outputDirectory": ".output",
  "installCommand": "pnpm install",
  "env": { "SKIP_ENV_VALIDATION": "1" }
}
```

---

## Implementation Steps

### Phase 1: Foundation (Steps 1-4)
1. Update `.gitignore` - add `_keys/*`, `!_keys/.gitkeep`, `.github/.secrets.*`, `.github/workflows/deploy.*.yml`, `.env.prod`, `.env.stag`, `scripts/dist/`, `scripts/node_modules/`
2. Update `.dockerignore` - add `_keys`, `scripts`, `.github`, `*.md`
3. Create `_keys/.gitkeep`
4. Update `.env.example` with `GITHUB_SECRET_*` documentation

### Phase 2: Endpoints & Migration (Steps 5-10)
5. Create `src/lib/buildinfo.ts` - build version info from VITE_ env vars
6. Create `src/lib/bootinfo.ts` - service status tracking (setServiceStatus, getBootInfo)
7. Create `src/routes/api.health.ts` - minimal Docker health check
8. Create `src/routes/api.version.ts` - public build info endpoint
9. Create `src/routes/api.i.bootinfo.ts` - internal boot status (guarded by x-internal-key)
10. Create `migrate.mjs` - standalone Drizzle migration runner
11. Add `INTERNAL_KEY` to `.env.example`
12. Register DB boot status in `src/db/index.ts` using `setServiceStatus()`

### Phase 3: Docker Enhancement
13. Rewrite `.docker/Dockerfile.production` (3-stage)
14. Update `.docker/docker-compose.yaml`

### Phase 4: Taskfile
15. Rewrite `.docker/Taskfile.yml` (dev + prod + review + act)
16. Update root `Taskfile.yml` (add scripts include)

### Phase 5: Scripts CLI
17. Create `scripts/package.json`
18. Create `scripts/tsconfig.json`
19. Create `scripts/src/lib/constants.ts`
20. Create `scripts/src/lib/keys.ts`
21. Create `scripts/src/lib/secrets.ts` (core: buildAndUpdateSecrets, filterEnvFileForDeployment)
22. Create `scripts/src/lib/template.ts` (createGithubDeployYaml)
23. Create `scripts/src/commands/secrets-update.ts`
24. Create `scripts/src/commands/secrets-push.ts`
25. Create `scripts/src/commands/secrets-read.ts`
26. Create `scripts/src/commands/secrets-clean.ts`
27. Create `scripts/src/commands/secrets-list.ts`
28. Create `scripts/src/commands/env-setup.ts`
29. Create `scripts/src/commands/env-create.ts`
30. Create `scripts/src/commands/env-normalize.ts`
31. Create `scripts/src/commands/env-generate.ts`
32. Create `scripts/src/index.ts`
33. Create `scripts/Taskfile.yml`
34. Run `cd scripts && pnpm install`

### Phase 6: GitHub Actions
35. Create `.github/workflows/deploy.yml.tmpl`
36. Create `.env.prod` with real values + GITHUB_SECRET_* vars

### Phase 7: Vercel
37. Create `vercel.json`

---

## Verification Checklist

```bash
# 1. Docker build
task docker:prod:build
# ✓ 3-stage build completes

# 2. Endpoints
task docker:prod:run
curl http://localhost:3000/api/health
# ✓ Returns { status: "ok" }
curl http://localhost:3000/api/version
# ✓ Returns { version, commit, branch, buildTime }
curl -H "x-internal-key: YOUR_KEY" http://localhost:3000/api/i/bootinfo
# ✓ Returns { database: { status: "ok" }, ... }
curl http://localhost:3000/api/i/bootinfo
# ✓ Returns 401 unauthorized
task docker:prod:stop

# 3. Review build from branch
task docker:review:build BRANCH=main
# ✓ Image built as boilerplate-tanstack:review-main

# 4. Review deployment
task docker:review:up BRANCH=main PORT=3010
curl http://localhost:3010/api/health
# ✓ Running on port 3010
task docker:review:list
# ✓ Shows review-main
task docker:review:down BRANCH=main

# 5. Secrets system
# Create .env.prod with GITHUB_SECRET_* vars
task scripts:gh:secrets:update -- --env=prod
# ✓ Generates .github/.secrets.prod
# ✓ Generates .github/workflows/deploy.prod.yml

task scripts:gh:secrets:read -- --env=prod
# ✓ Shows secret keys

# 6. act testing
task docker:act:list
# ✓ Lists build-and-push and deploy jobs
task docker:act:dry
# ✓ Dry run succeeds
```
