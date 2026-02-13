# Frontend Standards (React)

Standards for the React web app in `/web`.

## Tech Stack

- React 19 + React Router v7
- TailwindCSS v4
- TanStack Query + Form
- graphql-request
- Radix UI / shadcn components
- Lucide React icons

## Code Style and Structure

- Write concise, technical TypeScript code with accurate examples.
- Use functional and declarative programming patterns; avoid classes.
- Prefer iteration and modularization over code duplication.
- Use descriptive variable names with auxiliary verbs (e.g., `isLoading`, `hasError`).
- Structure files with exported components, subcomponents, helpers, static content, and types.
- **NEVER delete comments unless explicitly asked** - Preserve all existing comments.

## Naming Conventions

- Use lowercase with dashes for directories (e.g., `components/auth-wizard`).
- Use PascalCase for component file names (e.g., `DeleteRecord.tsx`, `UserProfile.tsx`).
- Use default exports for single direct components.
- Favor named exports when exporting multiple components from a single file.

## TypeScript Usage

- Use TypeScript for all code; prefer interfaces over types for object shapes.
- Avoid enums; use literal types or maps instead.
- Use functional components with TypeScript interfaces for props.
- Utilize Zod for schema validation and type inference where appropriate.

## Syntax and Formatting

- Use the `function` keyword for pure functions and components.
- Always use curly braces with arrow functions (no implicit returns for components).
- Do not use single-line statements in conditionals; always use curly braces.
- Use declarative JSX.

```tsx
// Good
function MyComponent({ name }: Props) {
  return <div>{name}</div>;
}

// Good
const handleClick = () => {
  doSomething();
};

// Bad - no implicit returns for components
const MyComponent = ({ name }: Props) => <div>{name}</div>;
```

## UI and Styling

- Use Shadcn UI, Radix, and Tailwind for components and styling.
- Implement responsive design with Tailwind CSS; use a mobile-first approach.
- Components are in `app/components/ui/`.

## State Management and Data Fetching

- Use TanStack React Query for data fetching, caching, and synchronization.
- Use Zustand for complex client-side state management (if needed).
- Minimize the use of `useEffect` and `useState`; favor derived state and memoization when possible.

### React Query Pattern

```tsx
import { useQuery, useMutation } from "@tanstack/react-query";
import { getGraphQLClient } from "~/lib/graphql-client";

const QUERY = `query GetData { ... }`;

function MyComponent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["unique-key"],
    queryFn: async () => {
      const client = getGraphQLClient();
      return client.request(QUERY);
    },
  });
}
```

## React Router v7

- Use functional components and TypeScript interfaces.
- Use declarative JSX.
- Use `function`, not `const`, for components.
- Place static content and interfaces at file end.
- Use content variables for static content outside render functions.

### Route File Structure

```tsx
// Meta tags export
export function meta() {
  return [
    { title: "Page Title" },
    { name: "description", content: "..." },
  ];
}

// Main component
export default function PageComponent() {
  return <div>...</div>;
}

// Types at end of file
interface Props {
  // ...
}
```

## Error Handling

- Prioritize error handling and edge cases.
- Handle errors and edge cases at the beginning of functions.
- Use early returns for error conditions to avoid deep nesting.
- Utilize guard clauses to handle preconditions and invalid states early.
- Implement proper error logging and user-friendly error messages.

```tsx
function processData(data: Data | null) {
  if (!data) {
    return <ErrorMessage message="No data available" />;
  }

  if (data.items.length === 0) {
    return <EmptyState />;
  }

  return <DataList items={data.items} />;
}
```

## Forms (TanStack Form)

```tsx
import { useForm } from "@tanstack/react-form";

function MyForm() {
  const form = useForm({
    defaultValues: {
      email: "",
    },
    onSubmit: async ({ value }) => {
      await handleSubmit(value);
    },
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      form.handleSubmit();
    }}>
      <form.Field
        name="email"
        validators={{
          onChange: ({ value }) =>
            !value ? "Email is required" : undefined,
        }}
      >
        {(field) => (
          <Input
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
          />
        )}
      </form.Field>
    </form>
  );
}
```

## Performance Optimization

- Wrap components in Suspense with fallback when needed.
- Use dynamic loading for non-critical components.
- Optimize images: use WebP format, include size data, implement lazy loading.

## Preferred Packages

| Package | Use Case |
|---------|----------|
| `@tanstack/react-query` | Data fetching and caching |
| `@tanstack/react-form` | Form handling with validation |
| `graphql-request` | GraphQL client |
| `zod` | Schema validation |
| `zustand` | Client-side state (if needed) |
| `lucide-react` | Icons |
| `js-cookie` | Cookie management |
| `jwt-decode` | JWT token decoding |
| `clsx` / `tailwind-merge` | Conditional class names |

## File Organization

```
web/app/
├── components/
│   ├── ui/           # shadcn/ui primitives
│   └── [feature]/    # Feature-specific components
├── hooks/            # Custom React hooks
├── lib/              # Utilities and clients
├── routes/           # Route components
├── app.css           # Global styles
├── root.tsx          # Root layout
└── routes.ts         # Route configuration
```

## Authentication

- Tokens stored in cookies via `js-cookie`
- Use `~/lib/auth.ts` utilities:
  - `isAuthenticated()` - Check if user is logged in
  - `getCurrentUser()` - Get user from token
  - `isTokenExpired(token)` - Check token expiry
- Use `~/lib/graphql-client.ts` for authenticated requests:
  - `getGraphQLClient()` - Client with auth header
  - `setAuthToken(token)` - Store token
  - `removeAuthToken()` - Clear token
