# tRPC Integration

Typesafe API layer using [tRPC](https://trpc.io/) with TanStack Query integration.

## Directory Structure

```
src/integrations/trpc/
├── init.ts                    # Core tRPC initialization
├── react.ts                   # React hooks (TRPCProvider, useTRPC)
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
init.ts (base setup)
  └─> procedures/ (middleware layers)
        └─> routers/ (handlers grouped by domain)
              └─> schema/ (Zod input validation per domain)
```

- **`init.ts`** — Creates the tRPC instance with superjson transformer. Exports `createTRPCRouter` and `baseProcedure`.
- **`procedures/`** — Wraps `baseProcedure` with middleware to create `publicProcedure`, `authedProcedure`, etc.
- **`routers/`** — Each file is a domain (todos, posts, users…). The root `index.ts` merges them into one router.
- **`routers/schema/`** — Zod schemas for input validation, colocated by domain. Each schema file exports both the schema and its inferred TypeScript type.
- **`react.ts`** — Creates the React context (`TRPCProvider`, `useTRPC`) for client-side usage.

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

export const getUserInputSchema = z.object({
  id: z.number(),
})
export type GetUserInput = z.infer<typeof getUserInputSchema>
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
import { TRPCError } from '@trpc/server'
import type { TRPCRouterRecord } from '@trpc/server'
import { publicProcedure } from '../procedures'
import { createUserInputSchema, getUserInputSchema } from './schema/users'

export const usersRouter = {
  list: publicProcedure.query(async () => {
    // return await db.query.users.findMany()
    return []
  }),

  get: publicProcedure
    .input(getUserInputSchema)
    .query(async ({ input }) => {
      // const user = await db.query.users.findFirst({ where: eq(users.id, input.id) })
      // if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      // return user
    }),

  create: publicProcedure
    .input(createUserInputSchema)
    .mutation(async ({ input }) => {
      // return await db.insert(users).values(input).returning()
    }),
} satisfies TRPCRouterRecord
```

**4. Register in root router**

```ts
// routers/index.ts
import { createTRPCRouter } from '../init'
import { todosRouter } from './todos'
import { postsRouter } from './posts'
import { usersRouter } from './users'  // <-- add this

export const trpcRouter = createTRPCRouter({
  todos: todosRouter,
  posts: postsRouter,
  users: usersRouter,  // <-- add this
})

export type TRPCRouter = typeof trpcRouter
```

That's it. The new `trpc.users.*` namespace is now available on both server and client, fully typed.

---

### Adding a New Procedure (Middleware)

Procedures live in `procedures/index.ts`. To add an authenticated procedure:

```ts
// procedures/index.ts
import { TRPCError } from '@trpc/server'
import { baseProcedure } from '../init'

export const publicProcedure = baseProcedure

export const authedProcedure = baseProcedure.use(async ({ ctx, next }) => {
  // Replace with your auth logic
  const user = await getAuthUser(ctx)
  if (!user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' })
  }
  return next({ ctx: { ...ctx, user } })
})
```

Then use it in any router:

```ts
import { authedProcedure } from '../procedures'

export const secretRouter = {
  getSecret: authedProcedure.query(({ ctx }) => {
    return { message: `Hello ${ctx.user.name}` }
  }),
} satisfies TRPCRouterRecord
```

---

### Using tRPC in Components

**Query (fetch data)**

```tsx
import { useQuery } from '@tanstack/react-query'
import { useTRPC } from '@/integrations/trpc/react'

function PostList() {
  const trpc = useTRPC()
  const { data: posts } = useQuery(trpc.posts.list.queryOptions())

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
import { useTRPC } from '@/integrations/trpc/react'

function CreatePost() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const { mutate: createPost } = useMutation({
    ...trpc.posts.create.mutationOptions(),
    onSuccess: () => {
      // Invalidate the posts list to refetch
      queryClient.invalidateQueries({ queryKey: trpc.posts.list.queryKey() })
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
      context.trpc.posts.list.queryOptions(),
    )
  },
})
```

---

### Error Handling

Use `TRPCError` with standard codes in your handlers:

```ts
import { TRPCError } from '@trpc/server'

// In a router handler:
throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found' })
throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not authenticated' })
throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid input' })
throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' })
throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' })
```

---

### Conventions

| Convention | Rule |
|---|---|
| Router files | One file per domain in `routers/` |
| Schema files | One file per domain in `routers/schema/`, export both schema and type |
| Naming | Router: `{domain}Router`, Schema: `{action}{Domain}InputSchema` |
| Procedures | Use the most restrictive procedure that fits (`publicProcedure` vs `authedProcedure`) |
| Errors | Always use `TRPCError` with appropriate codes, never raw `throw new Error()` |
| Types | Let tRPC infer return types — don't manually type outputs |
