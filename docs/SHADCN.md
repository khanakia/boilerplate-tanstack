# shadcn/ui Integration

shadcn/ui provides copy-paste UI components built on Radix UI primitives and styled with Tailwind CSS. Components live in `src/components/ui/` and are fully owned by the project — no runtime dependency on shadcn.

---

## Table of Contents

1. [Directory Structure](#directory-structure)
2. [How It Works](#how-it-works)
3. [Configuration](#configuration)
4. [Installed Components](#installed-components)
5. [Adding Components](#adding-components)
6. [Using Components](#using-components)
7. [Theming](#theming)
8. [Dark Mode](#dark-mode)
9. [The `cn()` Utility](#the-cn-utility)
10. [Setup Guide (Adding to a Fresh Project)](#setup-guide)
11. [Removal Guide](#removal-guide)

---

## Directory Structure

```
project root
├── components.json                        # shadcn CLI configuration
└── src/
    ├── styles.css                         # Tailwind v4 + theme CSS variables
    ├── lib/
    │   └── utils.ts                       # cn() utility (clsx + tailwind-merge)
    ├── hooks/                             # Custom React hooks (added by shadcn CLI)
    └── components/
        └── ui/                            # shadcn component files
            ├── button.tsx
            ├── input.tsx
            ├── label.tsx
            ├── select.tsx
            ├── slider.tsx
            ├── switch.tsx
            └── textarea.tsx
```

---

## How It Works

### 1. Components are source code, not a library

When you add a shadcn component, the CLI copies the component source into `src/components/ui/`. You own the code and can modify it freely. There is no `shadcn` runtime package — components depend only on Radix UI, CVA, and Tailwind.

### 2. Tailwind CSS v4 with CSS variables

The project uses Tailwind CSS v4 via the `@tailwindcss/vite` plugin. Theme tokens (colors, radius, etc.) are defined as CSS variables in `src/styles.css` and mapped to Tailwind's `@theme` block. Components reference these tokens (e.g., `bg-primary`, `text-muted-foreground`), making theming centralized.

### 3. Class Variance Authority (CVA) for variants

Components like `Button` use CVA to define variant styles (e.g., `variant="destructive"`, `size="sm"`). This keeps variant logic co-located with the component and fully type-safe.

---

## Configuration

The `components.json` file at the project root configures the shadcn CLI:

| Option | Value | Description |
|---|---|---|
| `style` | `new-york` | Component style preset |
| `rsc` | `false` | No React Server Components (TanStack Start) |
| `tsx` | `true` | Generate TypeScript files |
| `tailwind.css` | `src/styles.css` | CSS file with theme variables |
| `tailwind.baseColor` | `zinc` | Base neutral color palette |
| `tailwind.cssVariables` | `true` | Use CSS variables for colors |
| `iconLibrary` | `lucide` | Icon library for components |

### Path aliases

| Alias | Resolves to |
|---|---|
| `@/components` | `src/components` |
| `@/components/ui` | `src/components/ui` |
| `@/lib` | `src/lib` |
| `@/lib/utils` | `src/lib/utils` |
| `@/hooks` | `src/hooks` |

These are configured in both `components.json` (for the CLI) and `tsconfig.json` (for TypeScript resolution).

---

## Installed Components

| Component | File | Radix Dependency |
|---|---|---|
| Button | `src/components/ui/button.tsx` | `radix-ui` (Slot) |
| Input | `src/components/ui/input.tsx` | — |
| Label | `src/components/ui/label.tsx` | `radix-ui` |
| Select | `src/components/ui/select.tsx` | `radix-ui` |
| Slider | `src/components/ui/slider.tsx` | `radix-ui` |
| Switch | `src/components/ui/switch.tsx` | `radix-ui` |
| Textarea | `src/components/ui/textarea.tsx` | — |

---

## Adding Components

Use the shadcn CLI to add new components:

```bash
pnpm dlx shadcn@latest add <component-name>
```

### Examples

```bash
# Single component
pnpm dlx shadcn@latest add dialog

# Multiple components at once
pnpm dlx shadcn@latest add card dropdown-menu tooltip

# Browse available components
pnpm dlx shadcn@latest add
```

The CLI reads `components.json` for paths and settings, then copies the component source into `src/components/ui/`. If the component requires a hook, it goes into `src/hooks/`.

### After adding a component

1. The component is ready to import from `@/components/ui/<name>`
2. Any new Radix dependencies are auto-installed
3. No additional configuration needed

---

## Using Components

### Basic usage

```tsx
import { Button } from "@/components/ui/button";

function MyPage() {
    return (
        <Button variant="outline" size="sm">
            Click me
        </Button>
    );
}
```

### Button variants

```tsx
<Button variant="default">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>
```

### Button sizes

```tsx
<Button size="xs">Extra Small</Button>
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><IconComponent /></Button>
```

### Composition with asChild

Use `asChild` to render a different element (e.g., a link) with button styles:

```tsx
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

<Button asChild>
    <Link to="/dashboard">Go to Dashboard</Link>
</Button>
```

### Form components

```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

<div>
    <Label htmlFor="email">Email</Label>
    <Input id="email" type="email" placeholder="you@example.com" />
</div>

<div>
    <Label htmlFor="message">Message</Label>
    <Textarea id="message" placeholder="Type your message" />
</div>
```

---

## Theming

### How theming works

All theme tokens are CSS variables defined in `src/styles.css`:

```
:root { ... }          → Light mode variables
.dark { ... }          → Dark mode variables
@theme inline { ... }  → Maps CSS vars to Tailwind tokens
```

### Customizing colors

Edit the CSS variables in `src/styles.css` under `:root` (light) and `.dark` (dark). Colors use the OKLCh color space:

```css
:root {
    --primary: oklch(0.21 0.006 285.885);
    --primary-foreground: oklch(0.985 0 0);
}
```

Each semantic color has a matching `-foreground` variable for text contrast. The key tokens:

| Token | Usage |
|---|---|
| `background` / `foreground` | Page background and body text |
| `primary` / `primary-foreground` | Primary buttons and actions |
| `secondary` / `secondary-foreground` | Secondary elements |
| `muted` / `muted-foreground` | Subdued backgrounds and text |
| `accent` / `accent-foreground` | Hover states and highlights |
| `destructive` / `destructive-foreground` | Error states and delete actions |
| `border` | Default border color |
| `input` | Form input borders |
| `ring` | Focus ring color |
| `chart-1` through `chart-5` | Chart/data visualization colors |

### Border radius

Controlled by the `--radius` variable. All radius sizes derive from it:

```css
:root {
    --radius: 0.625rem;
}
```

Components use `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl` which map to calculated values based on `--radius`.

---

## Dark Mode

Dark mode uses the `dark` class strategy. Add the `dark` class to any parent element (typically `<html>` or `<body>`) to activate dark mode:

```html
<html class="dark">
```

The custom variant is defined in `src/styles.css`:

```css
@custom-variant dark (&:is(.dark *));
```

This means Tailwind's `dark:` prefix works by checking for the `.dark` class on an ancestor element.

---

## The `cn()` Utility

Located at `src/lib/utils.ts`, the `cn()` function merges Tailwind classes safely:

```ts
import { cn } from "@/lib/utils";

// Merges classes and resolves conflicts (last wins)
cn("px-4 py-2", "px-6");           // → "py-2 px-6"
cn("text-red-500", false && "hidden"); // → "text-red-500"
cn("bg-primary", className);        // → safe merge with prop
```

It combines `clsx` (conditional class joining) with `tailwind-merge` (conflict resolution). All shadcn components use this for their `className` prop handling.

---

## Setup Guide

### Adding shadcn/ui to a fresh TanStack Start project

#### 1. Install dependencies

```bash
pnpm add clsx tailwind-merge class-variance-authority
pnpm add radix-ui lucide-react
pnpm add tw-animate-css
```

#### 2. Set up Tailwind CSS v4

```bash
pnpm add tailwindcss @tailwindcss/vite
```

Add the Vite plugin in your Vite config:

```ts
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    plugins: [tailwindcss()],
});
```

#### 3. Create the `cn()` utility

Create `src/lib/utils.ts`:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
```

#### 4. Initialize shadcn

```bash
pnpm dlx shadcn@latest init
```

The CLI will prompt for:
- Style (choose `new-york`)
- Base color (choose `zinc`)
- CSS variables (choose `yes`)
- CSS file path (enter `src/styles.css`)

This creates `components.json` and updates `src/styles.css` with theme variables.

#### 5. Verify path aliases

Ensure `tsconfig.json` has the `@/*` path alias:

```json
{
    "compilerOptions": {
        "paths": {
            "@/*": ["./src/*"]
        }
    }
}
```

#### 6. Add your first component

```bash
pnpm dlx shadcn@latest add button
```

#### 7. Test it

```tsx
import { Button } from "@/components/ui/button";

export function MyComponent() {
    return <Button>It works!</Button>;
}
```

---

## Removal Guide

### Removing shadcn/ui from the project

#### 1. Delete UI components

```bash
rm -r src/components/ui/
```

#### 2. Delete configuration

```bash
rm components.json
```

#### 3. Remove `cn()` utility (if unused elsewhere)

```bash
rm src/lib/utils.ts
```

#### 4. Clean up CSS

In `src/styles.css`, remove the theme CSS variables (`:root`, `.dark`, `@theme inline` blocks) and the `tw-animate-css` import. Keep the Tailwind import and any custom styles.

#### 5. Remove dependencies

```bash
pnpm remove class-variance-authority radix-ui lucide-react tw-animate-css clsx tailwind-merge
```

#### 6. Remove component imports

Search for and remove any remaining imports from `@/components/ui/` in your application code.
