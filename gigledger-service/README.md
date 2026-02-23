# gigledger-service

Kotlin Spring Boot 3.x service (Java 21) for GigLedger invoice PDF generation.

## Endpoints

- `GET /health`
- `GET /api/pdf/invoice/{invoiceId}` (requires `Authorization: Bearer <supabase_access_token>`)
- `GET /public/invoice/{token}/pdf` (public token-gated)

## Environment Variables

```bash
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
SUPABASE_JWT_ISSUER=https://<project-ref>.supabase.co/auth/v1
PORT=8080
```

Notes:
- `SUPABASE_SERVICE_ROLE_KEY` is used only by this backend service.
- `/api/pdf/invoice/{invoiceId}` validates Supabase JWT via JWKS from issuer.
- Service enforces `invoice.user_id == jwt.sub` for authenticated invoice PDF endpoint.

## Build & Run

If Gradle is installed globally:

```bash
cd gigledger-service
gradle bootRun
```

Or generate wrapper once:

```bash
cd gigledger-service
gradle wrapper
./gradlew bootRun
```

## How Data Is Loaded

- Authenticated route:
  - Fetch invoice + client + line items using service role key.
  - Fetch settings by invoice `user_id`.
  - Enforce ownership against JWT `sub`.
- Public route:
  - Uses RPC `get_shared_invoice_by_token(token)` from Supabase.

## PDF Content

Generated PDF includes:
- Brand header (settings)
- Bill To (client)
- Invoice metadata
- Line-item table
- Totals and payment instructions
