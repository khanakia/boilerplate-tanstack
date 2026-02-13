## Project Tasks

This document tracks setup and infrastructure tasks for the boilerplate, including environment configuration, tooling, deployment targets, and base UI/state management.

* \[ ] **Dotenv / env management**
  * \[ ] Set up `dotenv-cli` with dotenv-flow for multi-environment `.env` handling
  * \[ ] Document how to run commands with env loading (e.g. `dotenv -e .env.local -- pnpm dev`)

* \[ ] **Vite TypeScript path aliases**
  * \[ ] Configure `vite-tsconfig-paths`
  * \[ ] Ensure `tsconfig.json` path aliases align with Vite config

* \[ ] **GraphQL Code Generator**
  * \[ ] Initialize GraphQL Codegen config
  * \[ ] Add scripts to generate types/hooks from schema and operations

* \[ ] **Docker deployment**
  * \[ ] Create production Dockerfile
  * \[ ] Add docker-compose (or docs) for production deployment

* \[ ] **Vercel deployment support**
  * \[ ] Add Vercel configuration (project settings, envs, build command)
  * \[ ] Document deployment process to Vercel

* \[ ] **Custom VPS deployment support**
  * \[ ] Add deployment guide for a generic VPS (reverse proxy, SSL, environment variables)
  * \[ ] Provide example systemd/service or PM2 config

* \[ ] **Docker development environment**
  * \[ ] Create dev-focused Dockerfile / compose setup
  * \[ ] Ensure hot reload and local volume mounts work in Docker dev

* \[ ] **Shadcn base UI**
  * \[ ] Set up base Shadcn UI (theme, shared primitives)
  * \[ ] Document how to add new Shadcn components (`pnpm dlx shadcn@latest add <component>`)

* \[ ] **Zod & Zustand setup**
  * \[ ] Add and configure Zod for schema validation
  * \[ ] Add and configure Zustand for state management (store patterns, examples)

* \[ ] **GitHub secrets management**
  * \[ ] Document which secrets are required for CI/CD and deployments
  * \[ ] Configure GitHub repository secrets / environment variables for pipelines
