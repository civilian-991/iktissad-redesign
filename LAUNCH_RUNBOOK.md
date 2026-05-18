# LAUNCH RUNBOOK — Iktissad News Platform

**Purpose:** the single, self-contained operator runbook to take the platform from "code merged on `main`" to "live in production." Every Supabase and Vercel dashboard action is enumerated below in the exact order it must be executed.

Audience: the human operator performing launch. Read this top-to-bottom on launch day.

Repo layout note: the Next.js app lives in the `iktissad-redesign/` subdirectory. All paths in this runbook are relative to repo root unless absolute.

---

## 1. Pre-flight Inventory

Before launch you must have:

### 1.1 Two Supabase projects provisioned
- **Staging** (e.g. `iktissad-staging`) — used for the preview deploy.
- **Production** (e.g. `iktissad-prod`) — used for the production deploy.

Both projects must be on a tier that supports the required extensions (`pgcrypto`, `pg_trgm`, `vector`/pgvector, `pg_stat_statements`). All of these are available on Supabase free/pro.

### 1.2 Vercel project linked to the repo
- Root directory set to `iktissad-redesign`.
- Framework preset: `Next.js`.
- Production branch: `main`.
- Preview deployments enabled on PRs.

### 1.3 Migrations to apply (42 files, chronological)

These are the actual files in `iktissad-redesign/supabase/migrations/`. They MUST run in this order — Supabase applies them by filename ascending, which matches the order below.

```
20260101000000_initial_schema.sql
20260308_001_content_model.sql
20260308_002_subscriptions.sql
20260308_003_analytics.sql
20260308_004_admin.sql
20260308_005_editorial.sql
20260308_006_ads.sql
20260308_007_revenue_functions.sql
20260318_008_settings.sql
20260318_009_fix_article_slugs.sql
20260319_010_performance_indexes.sql
20260319_011_article_type.sql
20260319_012_preview_tokens.sql
20260319_013_editorial_notes.sql
20260319_014_notification_types_phase2.sql
20260319_015_newsletters.sql
20260320_016_conversion_touches.sql
20260323_024_migration_columns.sql
20260324_025_magazine_pages_images.sql
20260329_025_video_url.sql
20260401_017_article_versions.sql
20260401_018_phase7_media.sql
20260401_019_webhooks_automations.sql
20260401_020_semantic_search.sql
20260401_021_sources.sql
20260401_022_article_series.sql
20260401_023_public_api_keys.sql
20260409_024_article_seo_fields.sql
20260409_025_rls_and_performance_fixes.sql
20260411_026_totp_recovery_codes.sql
20260412_027_phase4_monetization.sql
20260413_028_phase5_ai.sql
20260414_029_phase6_engagement.sql
20260415_030_phase7_analytics.sql
20260416_031_phase10_api_integrations.sql
20260426_032_contact_submissions.sql
20260426_033_bookmarks.sql
20260427_034_reading_sessions_auth_fk.sql
20260504_035_country_region.sql
20260507_036_country_region_backfill.sql
20260512_037_remove_seed_media.sql
20260518_038_abtests_table.sql
20260518_039_db_health_rpc.sql
20260518_040_newsletter_status_partial.sql
20260518_041_automation_runs.sql
```

### 1.4 Storage buckets to create
Four buckets, all consumed by `iktissad-redesign/src/lib/supabase/storage.ts`:
- `articles` — public
- `magazines` — public
- `media` — public (general media library shown in `/admin/media`)
- `avatars` — public

### 1.5 Required env vars (high level — full table in Step 4)
Boot-blocking: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`. Everything else is feature-gated.

---

## 2. Step 1: Apply Migrations

### 2.1 Prerequisite extensions (do this in the Supabase dashboard FIRST)

Open Supabase Dashboard → your project → **Database → Extensions** and enable these extensions BEFORE running any migrations:

| Extension | Required by migration | Notes |
|---|---|---|
| `pgcrypto` | `20260101000000_initial_schema.sql` | Usually enabled by default on Supabase. Verify it's on. |
| `pg_trgm` | `20260319_010_performance_indexes.sql` | The migration itself runs `CREATE EXTENSION IF NOT EXISTS pg_trgm`, but on hardened projects this can be blocked unless enabled via the dashboard first. Enable it to be safe. |
| `vector` (pgvector) | `20260401_020_semantic_search.sql` | Used for the `embedding vector(1536)` column. Enable via dashboard → Extensions → search "vector" → Enable. |
| `pg_stat_statements` | `20260518_039_db_health_rpc.sql` | **Not enabled by default.** You MUST flip this on in the dashboard before running migration 039, otherwise it errors out. Path: Database → Extensions → search "pg_stat_statements" → Enable. |

### 2.2 Option A — Supabase CLI (recommended for staging; safer for prod)

From the `iktissad-redesign/` directory:

```bash
cd iktissad-redesign

# Login once (opens a browser)
npx supabase login

# Link to the target project (run once per env)
npx supabase link --project-ref <your-project-ref>

# Apply ALL un-applied migrations in chronological order
npx supabase db push --linked
```

To preview what would run without applying, add `--dry-run`:
```bash
npx supabase db push --linked --dry-run
```

### 2.3 Option B — Dashboard SQL editor (slower but no CLI install)

For each file listed in Section 1.3, in the order listed:
1. Open Supabase Dashboard → SQL Editor → New query.
2. Open the local file `iktissad-redesign/supabase/migrations/<filename>.sql`.
3. Paste the entire file contents.
4. Click **Run**.
5. Confirm "Success. No rows returned." or the expected row count.
6. Move to the next file.

Do not skip ahead — several migrations depend on earlier columns/tables existing.

### 2.4 Migration purpose (one-line each)

| File | Purpose |
|---|---|
| `20260101000000_initial_schema.sql` | Base tables, enums, RLS scaffold, pgcrypto |
| `20260308_001_content_model.sql` | Articles, sections, sectors, countries, tags |
| `20260308_002_subscriptions.sql` | Plans, subscriptions, payments |
| `20260308_003_analytics.sql` | Page views, engagement tracking tables |
| `20260308_004_admin.sql` | `admin_roles` table + role enum |
| `20260308_005_editorial.sql` | Editorial workflow (review, scheduled) |
| `20260308_006_ads.sql` | Ad slots, campaigns, impressions |
| `20260308_007_revenue_functions.sql` | RPCs for revenue rollups |
| `20260318_008_settings.sql` | `site_settings` key/value store |
| `20260318_009_fix_article_slugs.sql` | Slug uniqueness + backfill |
| `20260319_010_performance_indexes.sql` | Indexes + pg_trgm extension |
| `20260319_011_article_type.sql` | Adds `article_type` column |
| `20260319_012_preview_tokens.sql` | Draft preview tokens |
| `20260319_013_editorial_notes.sql` | Inline editor comments table |
| `20260319_014_notification_types_phase2.sql` | New notification enum values |
| `20260319_015_newsletters.sql` | Newsletter issues + subscribers |
| `20260320_016_conversion_touches.sql` | Attribution tracking |
| `20260323_024_migration_columns.sql` | Legacy data import columns |
| `20260324_025_magazine_pages_images.sql` | Per-page images on magazine issues |
| `20260329_025_video_url.sql` | `video_url` column on articles |
| `20260401_017_article_versions.sql` | Article version history |
| `20260401_018_phase7_media.sql` | Media library table extensions |
| `20260401_019_webhooks_automations.sql` | Outbound webhooks + automations |
| `20260401_020_semantic_search.sql` | tsvector + pgvector embeddings + hybrid search RPC |
| `20260401_021_sources.sql` | Article sources table |
| `20260401_022_article_series.sql` | Series grouping |
| `20260401_023_public_api_keys.sql` | Public API key management |
| `20260409_024_article_seo_fields.sql` | OG/Twitter/canonical fields |
| `20260409_025_rls_and_performance_fixes.sql` | RLS hardening + `search_path` lockdown on functions |
| `20260411_026_totp_recovery_codes.sql` | 2FA recovery codes |
| `20260412_027_phase4_monetization.sql` | Paywall, gift links, micropayments tables |
| `20260413_028_phase5_ai.sql` | AI-generation log tables |
| `20260414_029_phase6_engagement.sql` | Reactions, polls, comments depth |
| `20260415_030_phase7_analytics.sql` | Funnel + cohort views |
| `20260416_031_phase10_api_integrations.sql` | Social accounts + post log, archival columns |
| `20260426_032_contact_submissions.sql` | Public contact-form table |
| `20260426_033_bookmarks.sql` | User bookmarks |
| `20260427_034_reading_sessions_auth_fk.sql` | FK reading_sessions → auth.users |
| `20260504_035_country_region.sql` | Adds `region` column to countries |
| `20260507_036_country_region_backfill.sql` | Backfills `region` values |
| `20260512_037_remove_seed_media.sql` | Drops mock seed media rows |
| `20260518_038_abtests_table.sql` | A/B test experiments table |
| `20260518_039_db_health_rpc.sql` | DB health RPCs — **requires pg_stat_statements pre-enabled** |
| `20260518_040_newsletter_status_partial.sql` | Partial index on newsletter status |
| `20260518_041_automation_runs.sql` | Automation execution log |

### 2.5 Optional seed data
If you want demo content in staging only:
```bash
# From the SQL editor, paste contents of:
iktissad-redesign/supabase/seed.sql
```
Do **not** run seed.sql in production.

---

## 3. Step 2: Create Storage Buckets

All four buckets are public. Public means anonymous GETs on the file path return the bytes; uploads still require auth via RLS.

### 3.1 Dashboard click path (per bucket)

For each of `articles`, `magazines`, `media`, `avatars`:

1. Supabase Dashboard → **Storage** → **New bucket**.
2. Name: enter the bucket name exactly (lowercase, no spaces).
3. Public bucket: **toggle ON**.
4. File size limit:
   - `articles`: **10 MB** (matches the `validateFile` default)
   - `magazines`: **50 MB** (PDFs of full magazine issues)
   - `media`: **10 MB** (general media library)
   - `avatars`: **2 MB** (small user avatars)
5. Allowed MIME types: leave blank (validated in app via `validateFile`).
6. Click **Save**.

### 3.2 RLS policies (SQL — paste into SQL editor after creating the buckets)

Run this single block after all four buckets exist. It allows authenticated uploads to all four buckets and public reads on all four (since all are public).

```sql
-- ============================================================
-- Storage RLS policies for: articles, magazines, media, avatars
-- ============================================================

-- Public READ on all four buckets (objects are served anonymously)
create policy "Public read articles"
  on storage.objects for select
  using (bucket_id = 'articles');

create policy "Public read magazines"
  on storage.objects for select
  using (bucket_id = 'magazines');

create policy "Public read media"
  on storage.objects for select
  using (bucket_id = 'media');

create policy "Public read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Authenticated INSERT on all four buckets
create policy "Authenticated upload articles"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'articles');

create policy "Authenticated upload magazines"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'magazines');

create policy "Authenticated upload media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media');

create policy "Authenticated upload avatars"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars');

-- Authenticated DELETE / UPDATE (own files — owner is auto-set by Supabase Storage)
create policy "Owner can update own file"
  on storage.objects for update
  to authenticated
  using (auth.uid() = owner)
  with check (auth.uid() = owner);

create policy "Owner can delete own file"
  on storage.objects for delete
  to authenticated
  using (auth.uid() = owner);

-- Admin override: super_admin / editor can delete or update any file
create policy "Admin can manage all files"
  on storage.objects for all
  to authenticated
  using (
    exists (
      select 1 from public.admin_roles
      where user_id = auth.uid()
        and role in ('super_admin', 'editor')
    )
  )
  with check (
    exists (
      select 1 from public.admin_roles
      where user_id = auth.uid()
        and role in ('super_admin', 'editor')
    )
  );
```

### 3.3 Restricted-read variant (NOT used — all four buckets are public)

If, in the future, you want a private bucket (e.g. `magazines-premium`), use this select policy template instead of "Public read":

```sql
create policy "Subscribers can read premium magazines"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'magazines-premium'
    and exists (
      select 1 from public.subscriptions
      where user_id = auth.uid()
        and status in ('active', 'trialing')
    )
  );
```

---

## 4. Step 3: Seed the First super_admin

The admin layout (`iktissad-redesign/src/app/admin/layout.tsx`) gates on a row existing in `public.admin_roles` with `role = 'super_admin'`. To create that row:

### 4.1 Create the auth user
Supabase Dashboard → **Authentication → Users → Add user → Create new user**.
- Email: `you@yourdomain.com` (use the operator's email).
- Password: set a strong one.
- Auto-confirm: **ON** (so they can log in immediately).

Click **Create user**.

### 4.2 Insert the admin_roles row

Open SQL Editor and run (replace the email):

```sql
insert into public.admin_roles (user_id, role, created_at)
select id, 'super_admin', now()
from auth.users
where email = 'you@yourdomain.com'
on conflict (user_id) do update set role = excluded.role;
```

Expected: `INSERT 0 1` (or `UPDATE 0 1` if the row already existed).

### 4.3 Verify
```sql
select u.email, r.role, r.created_at
from public.admin_roles r
join auth.users u on u.id = r.user_id
where r.role = 'super_admin';
```

Should return at least one row.

### 4.4 First login
Visit `https://<your-site>/login`, sign in with the new credentials, then navigate to `/admin`. You should land on the dashboard. If you get redirected back to `/login`, recheck steps 4.1–4.3.

---

## 5. Step 4: Environment Variables

Source of truth: `iktissad-redesign/.env.example`. Set these in **Vercel → Project → Settings → Environment Variables**. Pick the right environment scope ("Production", "Preview", or both) for each var.

### 5.1 Required to boot (the app will crash or 500 without these)

| Var | Where to get it | Environments | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL | Preview + Production (use staging project for Preview, prod project for Production) | Different value per env |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → `anon` `public` key | Preview + Production | Different value per env |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API → `service_role` `secret` key | Preview + Production | **Server-only — never expose**. Mark as Sensitive in Vercel. |
| `SUPABASE_JWT_SECRET` | Supabase Dashboard → Project Settings → API → JWT Secret | Preview + Production | Used to verify JWTs server-side. |
| `NEXT_PUBLIC_SITE_URL` | Your domain | Preview: the preview URL (or leave to default `https://*.vercel.app`); Production: `https://iktissad.com` | Used for OAuth redirects + payment return URLs. |

### 5.2 Required for specific features

| Var | Issuer | Required for | Environments |
|---|---|---|---|
| `MPGS_MODE` | Self (`test` or `live`) | Card payments | Production (`live`), Preview (`test`) |
| `MPGS_MERCHANT_ID` | Mastercard / NBAD bank | Card payments | Production + Preview |
| `MPGS_API_PASSWORD` | MPGS Merchant Administration portal | Card payments | Production + Preview (sensitive) |
| `MPGS_WEBHOOK_SECRET` | Configured in MPGS gateway → Webhooks | Payment status callbacks | Production + Preview (sensitive) |
| `VPC_URL` | Default `https://migs.mastercard.com.au/vpcpay` | Legacy NBAD/MIGS only | Optional — only set if migrating from old NBAD flow |
| `VPC_MERCHANT` | NBAD | Legacy NBAD/MIGS only | Optional |
| `VPC_ACCESS_CODE` | NBAD | Legacy NBAD/MIGS only | Optional |
| `VPC_SECURE_SECRET` | NBAD | Legacy NBAD/MIGS only | Optional (sensitive) |
| `VPC_LOCALE` | Self (`en` or `ar`) | Legacy NBAD/MIGS only | Optional |
| `PRINT_SECRET` | Self — `openssl rand -hex 32` | PDF export route auth | Production + Preview (sensitive) |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry → Project → Settings → Client Keys (DSN) | Browser error reporting | Production (Preview optional) |
| `SENTRY_DSN` | Same DSN | Server error reporting | Production (Preview optional) |
| `SENTRY_AUTH_TOKEN` | Sentry → Settings → Auth Tokens (scope: `project:releases`) | Source map upload at build time | Production + Preview (sensitive) |
| `SENTRY_ORG` | Sentry org slug | Source map upload | Production + Preview |
| `SENTRY_PROJECT` | Sentry project slug | Source map upload | Production + Preview |
| `APP_ENV` | Self (`production` / `staging` / `development`) | Sentry env tagging | Each env set to its own value |
| `NEXT_PUBLIC_APP_ENV` | Same as `APP_ENV` | Client-side env detection | Same |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Dashboard → Turnstile → Add site → Site Key | Bot protection on public forms | Production + Preview |
| `TURNSTILE_SECRET_KEY` | Cloudflare Dashboard → Turnstile → same site → Secret Key | Server-side verification | Production + Preview (sensitive) |
| `REVALIDATE_SECRET` | Self — `openssl rand -hex 32` (min 16 chars) | `/api/revalidate` ISR endpoint | Production + Preview (sensitive) |
| `ANTHROPIC_API_KEY` | Anthropic Console → API Keys | AI editor + AI social copy | Production + Preview (sensitive) |
| `SENDGRID_API_KEY` | SendGrid Dashboard → Settings → API Keys → Full Access | Transactional email + newsletter sends | Production + Preview (sensitive) |
| `SENDGRID_FROM_EMAIL` | The verified sender address you configured in SendGrid → Sender Authentication | Email `From:` header | Production + Preview |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Generate: `npx web-push generate-vapid-keys` | Web Push notifications | Production + Preview |
| `VAPID_PRIVATE_KEY` | Same command, private half | Web Push notifications | Production + Preview (sensitive) |
| `MARKET_DATA_PROVIDER` | Self (`alphavantage` or `finnhub`) | Sidebar market widgets | Production + Preview |
| `ALPHA_VANTAGE_API_KEY` | https://www.alphavantage.co/support/#api-key | Market data (when provider is alphavantage) | Production + Preview (sensitive) |
| `INDEXNOW_KEY` | Self — UUID; also expose at `https://<site>/<key>.txt` | Bing IndexNow instant indexing | Production only |

### 5.3 Optional (analytics + SEO verification)

| Var | Issuer | Environments | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics → Admin → Data Streams → Measurement ID (format `G-XXXXXXXXXX`) | Production only | Skip in Preview to avoid polluting analytics |
| `NEXT_PUBLIC_GSC_VERIFICATION` | Google Search Console → Settings → Ownership verification → HTML tag `content=` value | Production only | One-time verification |
| `NEXT_PUBLIC_GAM_NETWORK_CODE` | Google Ad Manager network code | Production only | Without this, ad slots render placeholders |

### 5.4 NOT environment variables — stored in the database

Social platform tokens for auto-posting (Twitter / LinkedIn / Telegram) are NOT env vars. After deploy, configure them via:
- `POST /api/admin/social-accounts` (from the admin UI), or
- The admin → Integrations → Social Accounts page.

They are stored row-per-account in the `social_accounts` table.

---

## 6. Step 5: First Deploy Verification (10-item smoke checklist)

After Vercel reports "Deployment Ready," walk this list in order. Each item should pass before moving to the next.

1. **Home page loads.** `https://iktissad.com/` returns 200, renders the Arabic homepage with hero + sections, no console errors.
2. **Language switch works.** Click the language toggle in the header → URL switches to `/en` (or equivalent), copy flips to English, layout becomes LTR.
3. **Article detail opens.** Click any article card → `https://iktissad.com/article/<slug>` loads, body text renders, images load from Supabase Storage (`articles` bucket).
4. **Login works.** `https://iktissad.com/login` → sign in with the super_admin credentials from Step 3 → redirected to `/`. Refresh — session persists.
5. **Admin dashboard loads.** Navigate to `/admin` → see the dashboard with KPI tiles, no 401/redirect loop.
6. **Admin can create + publish an article.** `/admin/articles/new` → fill title + body via the TipTap editor → upload a featured image (verifies `media` bucket + RLS) → click Publish → article appears on the public homepage within 60 s (after ISR revalidation).
7. **Sitemap + RSS reachable.** `https://iktissad.com/sitemap.xml` returns 200 XML; `https://iktissad.com/rss.xml` returns 200 RSS; `https://iktissad.com/news-sitemap.xml` returns 200 XML (Google News).
8. **Paywall triggers.** Open 4 different paywalled articles in an incognito window (anon meter free-limit defaults to 3) → the 4th one shows the `PaywallModal`. Confirm "Buy this article" CTA shows the per-article price.
9. **Newsletter form submits.** Subscribe a test email on the homepage footer → confirm row in `public.newsletter_subscribers` in Supabase; if SendGrid is configured, confirm welcome email arrives.
10. **Search works.** Use the header search for an Arabic keyword from one of your seeded articles → results page returns hits (validates pgvector + tsvector indexes from migration 020 + 010).

Stretch (do these on day 2 if smoke passes):
- Google Search Console → submit `https://iktissad.com/sitemap.xml`.
- Sentry → confirm first event has arrived (trigger one via `/api/_test/error` if you have one, or simply trip a 404 with a bad UUID on a known route).
- Cloudflare Turnstile → submit the contact form, confirm verification passes.

---

## 7. Rollback Plan

If any smoke check fails and the issue is not a 5-minute fix:

### 7.1 Roll back the deploy (Vercel)
Vercel Dashboard → Project → **Deployments** → find the previous green production deployment → click `...` → **Promote to Production**. Site reverts within ~30 s. No DB changes are reverted.

### 7.2 Roll back a single migration (Supabase)
There is no automated rollback. For each problematic migration, write a reverse SQL block manually and run it in the SQL editor. Examples:
- Added a column → `alter table X drop column Y;`
- Added a table → `drop table public.<name> cascade;`
- Added an index → `drop index if exists <name>;`
- Added an enum value → cannot drop a single enum value; recreate the enum type if absolutely needed (data-destructive).

Always take a snapshot **before** reverting destructive migrations:
- Supabase Dashboard → Database → **Backups** → **Create on-demand backup**.

### 7.3 If the database is corrupted
- Supabase Dashboard → Database → **Backups** → restore the most recent automated backup.
- Note: restore is **project-replacing** on free tier. On Pro+ it can be done in place. Plan for ~5–30 minutes of downtime.
- After restore, re-run Step 1 (migrations) and Step 3 (super_admin seed) only for the migrations that are missing.

### 7.4 If env vars are wrong
- Vercel → Settings → Environment Variables → fix the value.
- Vercel → Deployments → click `...` on the broken deployment → **Redeploy** (un-check "Use existing build cache" if a build-time var changed).

### 7.5 If Supabase Auth is broken
- Confirm `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` match the active project.
- Supabase Dashboard → Authentication → URL Configuration → ensure `Site URL` matches `NEXT_PUBLIC_SITE_URL` and `Redirect URLs` includes `https://iktissad.com/**` and your preview pattern (`https://*.vercel.app/**`).

### 7.6 Comms checklist for an extended outage
- Post a status banner on the homepage (admin → site settings → maintenance mode, if enabled), or temporarily set Vercel's "Maintenance mode" redirect.
- Notify the editorial team via the team chat — they will otherwise keep posting and lose drafts.
- Email subscribers only if outage exceeds 2 hours.

---

**End of runbook.** If a step in this document is wrong or missing, fix it here — this file is the source of truth for the launch operator.
