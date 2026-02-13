# GraphQL Codegen Integration

GraphQL Codegen is implemented as a self-contained pluggable module under `src/integrations/graphql-codegen/`. It generates fully typed React Query v5 hooks from `.graphql` operation files. It can be added to or removed from the boilerplate without touching unrelated code.

---

## Table of Contents

1. [Directory Structure](#directory-structure)
2. [How It Works](#how-it-works)
3. [File Breakdown](#file-breakdown)
4. [Taskfile Commands](#taskfile-commands)
5. [Setup Guide (Adding to a Fresh Project)](#setup-guide)
6. [Writing Operations](#writing-operations)
7. [Using Generated Hooks](#using-generated-hooks)
8. [Customizing the Fetcher](#customizing-the-fetcher)
9. [Troubleshooting](#troubleshooting)
10. [Removal Guide](#removal-guide)

---

## Directory Structure

```
project root
├── Taskfile.yml                                # Includes gql: tasks
├── .gitignore                                  # Ignores generated output
└── src/
    ├── generated/graphql/
    │   ├── .gitkeep                            # Keeps directory in git
    │   └── graphql.ts                          # Generated file (gitignored)
    └── integrations/graphql-codegen/
        ├── codegen.ts                          # Codegen config
        ├── fetcher.ts                          # Custom fetcher for generated hooks
        ├── schema.graphql                      # GraphQL operations (queries/mutations)
        └── Taskfile.yml                        # gql:generate task
```

---

## How It Works

The integration follows a three-step code generation pipeline:

### 1. Define operations in `.graphql` files

Write your GraphQL queries and mutations in `schema.graphql` (or additional `.graphql` files in the same directory).

### 2. Run code generation

`task gql:generate` introspects your GraphQL API schema, reads your `.graphql` operation files, and generates a single TypeScript file with:

- TypeScript types for every query/mutation and their variables
- React Query v5 `useQuery` / `useMutation` / `useSuspenseQuery` hooks for each operation
- A fetcher import that wires the hooks to your API

### 3. Import and use

The generated hooks are fully typed and ready to use in any React component:

```
schema.graphql ──codegen──> src/generated/graphql/graphql.ts ──import──> components
```

### The `import type` fix

When `useTypeImports: true` is enabled, codegen incorrectly emits `import type { useFetchData }` for the fetcher. Since the fetcher is called at runtime, it must be a value import. The `afterOneFileWrite` hook in `codegen.ts` automatically patches this with `sed`.

---

## File Breakdown

### `codegen.ts` — Codegen configuration

The main config file for `@graphql-codegen/cli`. Key settings:

| Setting | Value | Purpose |
|---|---|---|
| `schema` | `http://localhost:4000/graphql` | GraphQL endpoint to introspect (change this) |
| `documents` | `src/integrations/graphql-codegen/**/*.graphql` | Glob for operation files |
| `plugins` | `typescript`, `typescript-operations`, `typescript-react-query` | Generate types + React Query hooks |
| `reactQueryVersion` | `5` | Target React Query v5 API |
| `addSuspenseQuery` | `true` | Generate `useSuspenseQuery` hooks |
| `fetcher` | `@/integrations/graphql-codegen/fetcher#useFetchData` | Custom fetcher function |

### `fetcher.ts` — HTTP fetcher

A generic fetch-based function that the generated hooks call to execute GraphQL requests. Handles:

- POST requests with `Content-Type: application/json`
- GraphQL error extraction and throwing
- Configurable endpoint URL and headers

### `schema.graphql` — Operation definitions

Where you write your GraphQL queries and mutations. Ships with a placeholder `Hello` query. Replace with your actual operations.

### `Taskfile.yml` — Task definitions

Defines one task included under the `gql:` prefix:

| Command | Description |
|---|---|
| `task gql:generate` | Generate typed React Query hooks from `.graphql` files |

---

## Taskfile Commands

### Generate hooks

```bash
task gql:generate
```

Reads your `.graphql` files, introspects the schema from the configured endpoint, and writes `src/generated/graphql/graphql.ts`.

---

## Setup Guide

### Adding GraphQL Codegen to a fresh project

#### 1. Install dependencies

```bash
pnpm add graphql
pnpm add -D @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations @graphql-codegen/typescript-react-query
```

#### 2. Copy the integration folder

Copy the entire `src/integrations/graphql-codegen/` directory into your project.

#### 3. Create the generated output directory

```bash
mkdir -p src/generated/graphql
touch src/generated/graphql/.gitkeep
```

#### 4. Add Taskfile include

In the root `Taskfile.yml`:

```yaml
includes:
  gql:
    taskfile: src/integrations/graphql-codegen/Taskfile.yml
    dir: .
```

#### 5. Add gitignore entry

In `.gitignore`:

```
# Generated GraphQL hooks
src/generated/graphql/graphql.ts
```

#### 6. Configure your GraphQL endpoint

Edit `src/integrations/graphql-codegen/codegen.ts` — set `schema` to your GraphQL API URL.

Edit `src/integrations/graphql-codegen/fetcher.ts` — set `GRAPHQL_ENDPOINT` to the same URL.

#### 7. Write your first operation

Edit `src/integrations/graphql-codegen/schema.graphql`:

```graphql
query GetUsers {
  users {
    id
    name
    email
  }
}

mutation CreateUser($name: String!, $email: String!) {
  createUser(name: $name, email: $email) {
    id
    name
  }
}
```

#### 8. Generate

```bash
task gql:generate
```

#### 9. Verify

Check that `src/generated/graphql/graphql.ts` was created and contains typed hooks matching your operations.

---

## Writing Operations

All `.graphql` files under `src/integrations/graphql-codegen/` are picked up by codegen.

### Queries

```graphql
query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
    createdAt
  }
}
```

Generates: `useGetUserQuery`, `useGetUserSuspenseQuery`

### Mutations

```graphql
mutation UpdateUser($id: ID!, $name: String!) {
  updateUser(id: $id, name: $name) {
    id
    name
  }
}
```

Generates: `useUpdateUserMutation`

### Multiple files

You can split operations across files for organization:

```
src/integrations/graphql-codegen/
    schema.graphql          # shared queries
    users.graphql           # user-specific operations
    posts.graphql           # post-specific operations
```

All are picked up by the `**/*.graphql` glob in the codegen config.

---

## Using Generated Hooks

### Query hook

```tsx
import { useGetUsersQuery } from "@/generated/graphql/graphql";

function UserList() {
  const { data, isLoading, error } = useGetUsersQuery();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data?.users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### Suspense query hook

```tsx
import { useGetUsersSuspenseQuery } from "@/generated/graphql/graphql";

function UserList() {
  const { data } = useGetUsersSuspenseQuery();

  return (
    <ul>
      {data.users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### Mutation hook

```tsx
import { useCreateUserMutation } from "@/generated/graphql/graphql";

function CreateUserForm() {
  const mutation = useCreateUserMutation();

  const handleSubmit = (name: string, email: string) => {
    mutation.mutate({ name, email });
  };

  return <form onSubmit={/* ... */}>...</form>;
}
```

### Query with variables

```tsx
import { useGetUserQuery } from "@/generated/graphql/graphql";

function UserProfile({ userId }: { userId: string }) {
  const { data } = useGetUserQuery({ id: userId });

  return <div>{data?.user.name}</div>;
}
```

---

## Customizing the Fetcher

The fetcher in `fetcher.ts` is intentionally minimal. Common customizations:

### Adding authentication

```ts
const GRAPHQL_ENDPOINT = "https://api.example.com/graphql";

export function useFetchData<TData, TVariables>(
  query: string,
): (variables?: TVariables) => Promise<TData> {
  // Access auth state from your auth provider here
  const token = useAuthToken();

  return async (variables?: TVariables) => {
    const res = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    const json = await res.json();

    if (json.errors) {
      const message = json.errors
        .map((e: { message: string }) => e.message)
        .join("\n");
      throw new Error(message);
    }

    return json.data as TData;
  };
}
```

### Using credentials (cookies)

```ts
const res = await fetch(GRAPHQL_ENDPOINT, {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ query, variables }),
});
```

---

## Troubleshooting

### `Failed to load schema from http://localhost:4000/graphql`

The codegen CLI needs to introspect a running GraphQL server. Make sure your API is running before running `task gql:generate`.

### `import type { useFetchData }` causes runtime error

The `afterOneFileWrite` hook in `codegen.ts` should fix this automatically. If it doesn't (e.g. on Linux), update the `sed` command syntax:

```ts
// macOS (default)
"sed -i '' 's/import type { useFetchData }/import { useFetchData }/' src/generated/graphql/graphql.ts"

// Linux
"sed -i 's/import type { useFetchData }/import { useFetchData }/' src/generated/graphql/graphql.ts"
```

### Generated file has path alias issues

Ensure your `tsconfig.json` has the `@/*` path alias configured:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## Removal Guide

### Removing GraphQL Codegen from the project

#### 1. Delete the integration

```bash
rm -r src/integrations/graphql-codegen/
rm -r src/generated/graphql/
```

#### 2. Remove Taskfile include

In root `Taskfile.yml`, remove:

```yaml
  gql:
    taskfile: src/integrations/graphql-codegen/Taskfile.yml
    dir: .
```

#### 3. Remove gitignore entry

In `.gitignore`, remove:

```
# Generated GraphQL hooks
src/generated/graphql/graphql.ts
```

#### 4. Remove dependencies

```bash
pnpm remove graphql @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations @graphql-codegen/typescript-react-query
```

#### 5. Remove any generated imports

Search for and remove any remaining imports from `@/generated/graphql/graphql` in your application code.
