# Staging Environment Setup

## Overview

The staging environment mirrors production but uses a separate Supabase project and Vercel deployment. It allows editors and developers to preview changes before they reach production.

## Architecture

```
Production:  main branch  → Vercel prod   → prod Supabase project
Staging:     staging branch → Vercel preview → staging Supabase project
```

## Setup Steps

### 1. Create a Staging Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → New Project
2. Name: `iktissad-staging`
3. Region: same as production for consistency
4. Run all migrations from `supabase/migrations/` (001–031) in order
5. Create Storage buckets: `articles`, `magazines`, `media`, `avatars`
6. Create a staging admin user via Authentication → Add user

### 2. Create a Staging Branch

```bash
git checkout -b staging
git push -u origin staging
```

### 3. Configure Vercel

Option A — Branch-based preview (simplest):
1. Your Vercel project already creates preview deployments per branch
2. Go to Vercel Dashboard → Project → Settings → Environment Variables
3. Add all variables from `.env.staging` scoped to the **Preview** environment
4. Set `NEXT_PUBLIC_APP_ENV=staging` so the staging banner appears

Option B — Separate Vercel project:
1. Create a new Vercel project linked to the same repo
2. Set production branch to `staging`
3. Add all staging env vars
4. Optionally assign a custom domain: `staging.iktissad.com`

### 4. Verify

- Open the staging URL → amber "STAGING ENVIRONMENT" banner should appear at top
- Check `/api/health` returns `{ status: "healthy" }` with staging DB
- Sentry events should tag as `environment: staging`
- Payment gateway must be in TEST mode (`MPGS_MODE=test`)
- Analytics should be disabled (empty GA measurement ID)

## Staging Banner

The `StagingBanner` component (`src/components/StagingBanner.tsx`) renders a fixed amber bar when `NEXT_PUBLIC_APP_ENV` is not `production` or `development`. It's included in the root layout.

## Local Staging Testing

To test staging config locally:
```bash
cp .env.staging .env.local
# Fill in your staging Supabase credentials
npm run dev
```

## Seed Data

Staging should have its own seed data. Run:
```bash
psql $STAGING_DATABASE_URL < supabase/seed.sql
```
