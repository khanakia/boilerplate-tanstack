import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  // TODO: Replace with your GraphQL endpoint URL
  schema: "http://localhost:4000/graphql",
  documents: ["src/integrations/graphql-codegen/**/*.graphql"],
  generates: {
    "src/generated/graphql/graphql.ts": {
      plugins: [
        "typescript",
        "typescript-operations",
        "typescript-react-query",
      ],
      config: {
        reactQueryVersion: 5,
        useTypeImports: true,
        addSuspenseQuery: true,
        fetcher: {
          func: "@/integrations/graphql-codegen/fetcher#useFetchData",
          isReactHook: true,
        },
      },
    },
  },
  hooks: {
    afterOneFileWrite: [
      // Fix: codegen emits `import type { ... }` for the fetcher but it must
      // be a value import because it's called at runtime.
      "sed -i '' 's/import type { useFetchData }/import { useFetchData }/' src/generated/graphql/graphql.ts",
    ],
  },
};

export default config;
