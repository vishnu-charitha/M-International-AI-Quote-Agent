# M International — AI Quote Agent

An AI-assisted aviation aftermarket operations platform for monitoring RFQs, processing inbound requests, and coordinating operational workflows.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React, Vite, Tailwind CSS, shadcn/ui primitives, Wouter, TanStack Query

## Where things live

- `artifacts/ai-quote-agent` — deployable web application and operations UI
- `artifacts/api-server` — Express API with dashboard, RFQ, email, and AI review routes
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/db/src/schema` — PostgreSQL schema definitions for users, customers, RFQs, emails, and AI analyses
- `artifacts/api-server/src/services/mock-data.ts` — realistic Phase 1 aviation sample data

## Architecture decisions

- Phase 1 uses OpenAPI-first contracts so the frontend consumes generated hooks rather than duplicating API types.
- The API returns consistent aviation sample data while database tables establish the persistence model for later phases.
- Future modules use working routes with clear placeholder states rather than broken or blank navigation targets.
- AI review actions are wired to the API and update the in-memory Phase 1 queue until persistence is introduced.

## Product

- Operations dashboard with KPI summary, workflow progress, recent RFQ table, and activity feed
- Searchable/filterable RFQ Inbox and RFQ detail view
- Mock Email Inbox with AI analysis status
- AI Review queue with approve and reclassify actions
- Placeholder pages for planned workflow, operations, and administration modules

## User preferences

No additional preferences recorded.

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after changing `lib/api-spec/openapi.yaml`.
- Run the API and web services through their managed workflows so proxy routing and required environment variables are present.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
