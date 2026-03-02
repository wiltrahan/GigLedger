# AGENTS.md

This file is the operating guide for coding agents working in `GigLedger`.

## 1. Project Snapshot

GigLedger is a two-part app:

- Next.js app (`/`) for auth, dashboard, CRUD APIs, and UI.
- Kotlin Spring Boot service (`/gigledger-service`) for invoice PDF generation.

Primary data store and auth are in Supabase.

## 2. Repo Layout

- `app/`: Next.js App Router pages and API routes.
- `components/`: Client UI (dashboard, invoices, gigs, clients, tax, layout, shadcn/ui primitives).
- `lib/`: Supabase clients, API auth/response helpers, schemas, invoice total math.
- `supabase/sql/`: Canonical SQL schema kit and seed scripts.
- `supabase/migrations/`: Older baseline migration.
- `gigledger-service/`: Kotlin service for PDF generation.

## 3. Runtime + Tooling

Frontend:

- Next.js `16.1.6`, React `19`, TypeScript strict mode.
- Path alias: `@/*` (see `tsconfig.json`).
- Tailwind + shadcn/ui.

Backend service:

- Spring Boot `3.5.0`, Kotlin `1.9.25`, Java `21`.
- Uses Supabase REST + service role key for invoice/settings fetch.

## 4. Environment Variables

Frontend (`.env.local`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only usage)
- `GIGLEDGER_SERVICE_URL` (URL to Kotlin service)

Service (`gigledger-service`):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_ISSUER`
- `PORT` (default `8080`)

Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser code.

## 5. Architecture Rules To Preserve

### 5.1 Next API route conventions

When adding/editing routes under `app/api/**`:

- Authenticate via `requireUser()` (`lib/api/auth.ts`) unless route is intentionally public.
- Validate path params and body using zod schemas from `lib/api/schemas.ts`.
- Use shared response helpers from `lib/api/response.ts`:
  - `jsonOk`
  - `jsonError`
  - `jsonZodError`
  - `jsonSupabaseError`
- Keep error shape consistent: `{ error: { code, message, details } }`.

### 5.2 Auth/session behavior

- Session refresh and protected-route redirect logic is in `proxy.ts` + `lib/supabase/middleware.ts`.
- Protected pages also gate in `app/(protected)/layout.tsx`.
- OAuth callback exchange is in `app/auth/callback/route.ts`.

### 5.3 Data + security model

- RLS-first model: all business rows are owned by `user_id` and scoped to `auth.uid()`.
- Canonical full schema/policies are in `supabase/sql/gigledger_creator_dj_ops.sql`.
- Public invoice PDF path uses `invoice_shares` token + RPC `get_shared_invoice_by_token`.

If schema changes are needed:

- Update canonical SQL in `supabase/sql/gigledger_creator_dj_ops.sql`.
- Keep RLS and triggers consistent.
- Ensure both authenticated and public PDF flows remain valid.

### 5.4 Kotlin PDF service boundaries

- Security config allows:
  - Public: `/health`, `/public/**`
  - Auth required: `/api/**`
- Authenticated invoice PDF endpoint enforces ownership (`invoice.user_id == jwt.sub`).
- Public PDF endpoint resolves invoice via share token RPC.

Current implemented endpoints in service:

- `GET /health`
- `GET /api/pdf/invoice/{invoiceId}`
- `GET /public/invoice/{token}/pdf`

Note: frontend has a W-9 PDF proxy route (`/api/tax/w9/pdf`) but service-side W-9 PDF endpoint is not implemented yet.

## 6. Coding Style Observed In This Repo

- TypeScript: strict types, explicit zod validation, concise route handlers.
- Route params in dynamic API routes use `context.params` as `Promise<{ ... }>` and then `await context.params`.
- Shared utility logic lives in `lib/` or feature helpers (example: `components/invoices/helpers.ts`).
- UI components are mostly client components with local state + `fetch` calls to internal API routes.

Preserve existing style and naming instead of introducing a new pattern.

## 7. Validation Commands

Use these when changing related areas.

Backend service:

- `cd gigledger-service && ./gradlew test`

Status: currently passes.

Frontend:

- `npm run lint` is currently broken in this repo (`next lint` is not functioning with current Next/ESLint setup).
- `npx eslint .` also fails because no flat ESLint config exists.
- `npm run build` currently fails in this sandbox due Turbopack process/port restrictions (environment issue, not necessarily app logic).

So for frontend changes in this environment, rely on:

- Type-check/build feedback where possible.
- Focused code inspection.
- Manual route/component reasoning.

## 8. Change Checklist For Agents

For any non-trivial change:

1. Identify impacted layer(s): Next UI, Next API, Supabase SQL, Kotlin service.
2. Keep auth and ownership checks intact.
3. Keep API responses consistent with shared helpers.
4. If touching invoice math, preserve `computeTotals`/`normalizeLineItems` behavior.
5. If touching share-token/public PDF flow, verify token revocation/lookup path still works.
6. Run `./gradlew test` for service changes.
7. Document any untestable parts due environment/tooling limitations.

## 9. High-Risk Files (Read Carefully Before Editing)

- `lib/api/schemas.ts`
- `lib/api/response.ts`
- `lib/api/auth.ts`
- `proxy.ts`
- `supabase/sql/gigledger_creator_dj_ops.sql`
- `app/api/invoices/**`
- `gigledger-service/src/main/kotlin/com/gigledger/service/supabase/SupabaseInvoiceGateway.kt`
- `gigledger-service/src/main/kotlin/com/gigledger/service/config/SecurityConfig.kt`

