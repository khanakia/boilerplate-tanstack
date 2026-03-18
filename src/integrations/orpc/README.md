# oRPC Integration

Typesafe API layer using [oRPC](https://orpc.dev/) with TanStack Query integration.

## Directory Structure

```
src/integrations/orpc/
├── init.ts                    # Core oRPC initialization
├── react.ts                   # TanStack Query utils type + factory
├── procedures/
│   └── index.ts               # Procedure definitions (public, authed, etc.)
└── routers/
    ├── index.ts               # Root router (aggregates all sub-routers)
    ├── todos.ts               # Example: Todos domain handlers
    ├── posts.ts               # Example: Posts domain handlers
    └── schema/
        ├── index.ts           # Barrel export for all schemas
        ├── todos.ts           # Todos input schemas
        └── posts.ts           # Posts input schemas
```

## How It Works

```
init.ts (base `os` instance)
  └─> procedures/ (middleware layers)
        └─> routers/ (handlers grouped by domain)
              └─> schema/ (Zod input validation per domain)
```

- **`init.ts`** — Exports the base `os` instance from `@orpc/server`.
- **`procedures/`** — Wraps `os` with middleware to create `publicProcedure`, `authedProcedure`, etc.
- **`routers/`** — Each file is a domain (todos, posts…). The root `index.ts` merges them into one router object.
- **`routers/schema/`** — Zod schemas for input validation, colocated by domain.
- **`react.ts`** — Type definitions and factory for TanStack Query integration.

## Key Differences from tRPC

| tRPC | oRPC |
|------|------|
| `initTRPC.create()` | `os` from `@orpc/server` |
| `.query()` / `.mutation()` | `.handler()` (unified) |
| `createTRPCRouter({...})` | Plain objects |
| `TRPCError` | `ORPCError` |
| `fetchRequestHandler` | `RPCHandler` from `@orpc/server/fetch` |
| `createTRPCClient` + `httpBatchStreamLink` | `createORPCClient` + `RPCLink` |
| `createTRPCContext` (React Provider) | `createTanstackQueryUtils` (no provider needed) |

## Files Overview

| File | Purpose |
|------|---------|
| `src/integrations/orpc/init.ts` | Base `os` instance from `@orpc/server` |
| `src/integrations/orpc/react.ts` | `ORPCClient` type + `createORPCQueryUtils` factory |
| `src/integrations/orpc/procedures/index.ts` | `publicProcedure` (with commented `authedProcedure` example) |
| `src/integrations/orpc/routers/index.ts` | Root router aggregating all sub-routers |
| `src/integrations/orpc/routers/todos.ts` | Todos CRUD handlers |
| `src/integrations/orpc/routers/posts.ts` | Posts CRUD handlers |
| `src/integrations/orpc/routers/schema/` | Zod input schemas (todos + posts) |
| `src/integrations/orpc/README.md` | Full guide with conventions and examples |
| `src/routes/api.orpc.$.tsx` | Catch-all route handler at `/api/orpc/*` using `RPCHandler` |
| `src/routes/demo/orpc-todo.tsx` | Demo todo page using oRPC |

## Guides

### Adding a New Router

**1. Create the input schemas**

```ts
// routers/schema/users.ts
import { z } from 'zod'

export const createUserInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
})
export type CreateUserInput = z.infer<typeof createUserInputSchema>
```

**2. Export from schema barrel**

```ts
// routers/schema/index.ts
export * from './todos'
export * from './posts'
export * from './users'  // <-- add this
```

**3. Create the router**

```ts
// routers/users.ts
import { ORPCError } from '@orpc/server'
import { publicProcedure } from '../procedures'
import { createUserInputSchema } from './schema/users'

export const usersRouter = {
  list: publicProcedure.handler(async () => {
    return []
  }),

  create: publicProcedure
    .input(createUserInputSchema)
    .handler(async ({ input }) => {
      // return await db.insert(users).values(input).returning()
    }),
}
```

**4. Register in root router**

```ts
// routers/index.ts
import { todosRouter } from './todos'
import { postsRouter } from './posts'
import { usersRouter } from './users'  // <-- add this

export const orpcRouter = {
  todos: todosRouter,
  posts: postsRouter,
  users: usersRouter,  // <-- add this
}
```

---

### Adding a New Procedure (Middleware)

```ts
// procedures/index.ts
import { ORPCError } from '@orpc/server'
import { base } from '../init'

export const publicProcedure = base

export const authedProcedure = base.use(async ({ context, next }) => {
  const user = await getAuthUser(context)
  if (!user) {
    throw new ORPCError('UNAUTHORIZED', { message: 'Not authenticated' })
  }
  return next({ context: { ...context, user } })
})
```

---

### Using oRPC in Components

**Query (fetch data)**

```tsx
import { useQuery } from '@tanstack/react-query'

function PostList() {
  const { orpc } = Route.useRouteContext()
  const { data: posts } = useQuery(orpc.posts.list.queryOptions())

  return (
    <ul>
      {posts?.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}
```

**Mutation (create/update/delete)**

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'

function CreatePost() {
  const { orpc } = Route.useRouteContext()
  const queryClient = useQueryClient()

  const { mutate: createPost } = useMutation({
    ...orpc.posts.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.posts.list.queryKey() })
    },
  })

  return (
    <button onClick={() => createPost({ title: 'New Post', content: 'Hello world' })}>
      Create Post
    </button>
  )
}
```

**Prefetching in Route Loaders**

```tsx
export const Route = createFileRoute('/posts')({
  component: PostsPage,
  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery(
      context.orpc.posts.list.queryOptions(),
    )
  },
})
```

---

### Error Handling

```ts
import { ORPCError } from '@orpc/server'

throw new ORPCError('NOT_FOUND', { message: 'Resource not found' })
throw new ORPCError('UNAUTHORIZED', { message: 'Not authenticated' })
throw new ORPCError('BAD_REQUEST', { message: 'Invalid input' })
throw new ORPCError('FORBIDDEN', { message: 'Access denied' })
throw new ORPCError('INTERNAL_SERVER_ERROR', { message: 'Something went wrong' })
```

---

### Conventions

| Convention | Rule |
|---|---|
| Router files | One file per domain in `routers/` |
| Schema files | One file per domain in `routers/schema/`, export both schema and type |
| Naming | Router: `{domain}Router`, Schema: `{action}{Domain}InputSchema` |
| Procedures | Use the most restrictive procedure that fits (`publicProcedure` vs `authedProcedure`) |
| Errors | Always use `ORPCError` with appropriate codes |
| Handlers | Use `.handler()` for all procedures (no separate query/mutation) |
| Types | Let oRPC infer return types — don't manually type outputs |
