# GigLedger

GigLedger is a two-part app:

- Next.js app for auth, dashboard, CRUD APIs, and UI
- Kotlin Spring Boot service for invoice PDF generation

Supabase is the source of truth for auth and app data.

## Repo Layout

- `app/` Next.js App Router pages and API routes
- `components/` UI and client-side feature modules
- `lib/` shared helpers, Supabase clients, schemas, invoice math
- `gigledger-service/` Kotlin PDF service
- `supabase/sql/` canonical schema and policy SQL

## Prerequisites

- Node.js 20+
- npm
- Java 21

## Environment Setup

Create `.env.local` in the repo root.

Required values:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GIGLEDGER_SERVICE_URL=http://localhost:8080
```

Notes:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are used by the Next app
- `SUPABASE_SERVICE_ROLE_KEY` is used server-side only
- `GIGLEDGER_SERVICE_URL` should point at the Kotlin service

An example file is included at [.env.example](/Users/williamtrahan/Code/GigLedger/.env.example).

## Install Dependencies

From the repo root:

```bash
npm install
```

The frontend dev script is currently:

```bash
npm run dev
```

This uses `next dev --webpack` for a more stable local dev experience.

## Running Locally

### Frontend only

Use this for most UI work, auth flow work, CRUD work, and general app development:

```bash
npm run dev
```

Open:

```bash
http://localhost:3000
```

### Frontend + backend service

You need both services running if you want invoice PDF generation or public invoice PDF links to work.

Start the Kotlin service from the repo root:

```bash
./run-backend.sh
```

What `run-backend.sh` does:

- loads the root `.env.local`
- maps `NEXT_PUBLIC_SUPABASE_URL` to `SUPABASE_URL`
- derives `SUPABASE_JWT_ISSUER`
- runs `gigledger-service/./gradlew bootRun`

Default local ports:

- Next app: `http://localhost:3000`
- Kotlin service: `http://localhost:8080`

## What Requires the Kotlin Service

These flows depend on `gigledger-service` being up:

- authenticated invoice PDF route
- public invoice PDF share route

Most of the rest of the app works with just the Next app + Supabase.

## Common Commands

Frontend:

```bash
npm run dev
```

Backend:

```bash
./run-backend.sh
```

Kotlin tests:

```bash
cd gigledger-service
./gradlew test
```

Type-check frontend:

```bash
npx tsc --noEmit
```

## Known Local Caveats

- `npm run lint` is not reliable in the current repo setup
- `next dev` previously ran hot under Turbopack, so the repo now uses Webpack dev mode by default
- the frontend has a W-9 PDF proxy route, but the service-side W-9 PDF endpoint is not implemented yet

## Backend Service Notes

The Kotlin service README is here:

- [gigledger-service/README.md](/Users/williamtrahan/Code/GigLedger/gigledger-service/README.md)

Direct backend env vars, if you ever run it manually instead of `./run-backend.sh`:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_ISSUER=
PORT=8080
```
