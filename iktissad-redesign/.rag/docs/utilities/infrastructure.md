# Infrastructure & DevOps (Phase 9)

## CI/CD Pipeline

**File:** `.github/workflows/ci.yml`

GitHub Actions workflow that runs on every PR to `main` and on push to `main`.

### Jobs (run in parallel, then sequential build)

1. **lint** — `npm run lint` (ESLint)
2. **type-check** — `npm run type-check` (`tsc --noEmit`)
3. **build** — `npm run build` (depends on lint + type-check passing)

### Environment

- Node.js 24
- Working directory: `iktissad-redesign/`
- Concurrency: cancels in-progress runs on same branch
- Build job uses stub env vars for Supabase (build-time only)
- Sentry source maps uploaded via `SENTRY_AUTH_TOKEN` secret

### Vercel Integration

Vercel's GitHub app handles deployments:
- **PR opened/updated** → Preview deployment
- **Merge to main** → Production deployment

---

## Error Monitoring (Sentry)

### Configuration Files

| File | Purpose |
|------|---------|
| `sentry.client.config.ts` | Stub — redirects to `instrumentation-client.ts` |
| `sentry.server.config.ts` | Server-side init: DSN, env, traces (10% prod), local variables |
| `sentry.edge.config.ts` | Edge runtime init: DSN, env, traces |
| `instrumentation.ts` | Loads server/edge configs per runtime, exports `onRequestError` |
| `instrumentation-client.ts` | Client init: DSN, env, traces, Session Replay, router transitions |
| `next.config.ts` | `withSentryConfig` wrapper: source maps, tunnel `/monitoring` |

### Components

- **`SentryUserIdentification`** (`src/components/SentryUserIdentification.tsx`) — Client component in root layout. Identifies Supabase Auth user in Sentry context. Syncs on auth state changes.
- **`global-error.tsx`** (`src/app/global-error.tsx`) — App-level error boundary. Reports to `Sentry.captureException`. Shows Arabic error page with retry button. Uses inline styles (no Tailwind — layout is broken at this level).
- **`error.tsx`** (`src/app/error.tsx`) — Route-level error boundary. Reports to `Sentry.captureException`. Uses Tailwind classes and Lucide icons.

### Environment Variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `SENTRY_DSN` | Server | Server-side DSN |
| `NEXT_PUBLIC_SENTRY_DSN` | Client | Client-side DSN |
| `SENTRY_AUTH_TOKEN` | Build | Source map upload |
| `SENTRY_ORG` | Build | Organization slug |
| `SENTRY_PROJECT` | Build | Project slug |
| `APP_ENV` | Server | Environment tag |
| `NEXT_PUBLIC_APP_ENV` | Client | Environment tag |

### Tunnel Route

Sentry requests are tunneled through `/monitoring` to avoid ad-blockers. Exempted from CSRF in `proxy.ts`.

---

## Staging Environment

### Staging Banner

**Component:** `StagingBanner` (`src/components/StagingBanner.tsx`)

Fixed amber banner at top of viewport when `NEXT_PUBLIC_APP_ENV` is not `production` or `development`. Renders "STAGING ENVIRONMENT" text. `z-[9999]`, `pointer-events-none`.

Mounted in `src/app/layout.tsx` outside `<Providers>`.

### Configuration

- **Template:** `.env.staging` — Copy to `.env.local` for local staging testing
- **Key variable:** `NEXT_PUBLIC_APP_ENV=staging`
- **Payment:** Always `MPGS_MODE=test` in staging
- **Analytics:** Empty GA/GAM IDs to disable tracking
- **Turnstile:** Uses Cloudflare test keys

### Setup Documentation

Full setup guide: `docs/STAGING.md`

---

## Backup & Restore

### Documentation

Full procedure: `docs/BACKUP_RESTORE.md`

### Endpoint

`GET /api/admin/backup-status` — Returns database connection health, size, table count, server time, Supabase URL. Auth required.

---

## Health Check

`GET /api/health` — Public, unauthenticated. Returns database connectivity, latency, uptime, version. 200 when healthy, 503 when degraded. `Cache-Control: no-store`.
