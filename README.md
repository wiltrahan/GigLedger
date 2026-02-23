# GigLedger

Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui scaffold with Supabase auth.

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GIGLEDGER_SERVICE_URL=
```

## Supabase Security Notes

- All client/app CRUD should use the anon key with the logged-in user session.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser code.
- Keep service role usage server-only, ideally in the Kotlin PDF service.
- Enable RLS on every app table and author policies tied to `user_id = auth.uid()`.
