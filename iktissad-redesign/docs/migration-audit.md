# Migration Audit — Full Platform Review
> Updated: 2026-03-20
> Scope: iktissadonline.com (Drupal 7 → Supabase) + awalan.com (.NET → Supabase)

---

## Executive Summary — Key Findings from Sitemap Analysis

### iktissadonline.com Sitemap
- **Total indexed URLs:** ~800 (394 on page 1 + ~400 on page 2)
- **All URLs follow:** `/news/YYYY/MM/DD/[arabic-slug]` — single consistent pattern
- **Date coverage in sitemap:** June 2021 – November 2021 (page 2) and early 2025 (page 1)
- **⚠️ Gap detected:** No content indexed for 2022–2024 in the sitemap. This may indicate the sitemap is incomplete, or content from those years was never published to the public `/news/` path.
- **No non-article URLs** in sitemap: zero taxonomy pages, zero ranking pages, zero profile pages — those sections are not indexed.
- **SEO implication:** All old article URLs follow `/news/YYYY/MM/DD/slug`. The new platform must support this exact URL structure or issue 301 redirects from it.

### awalan.com Sitemap
- **No `/sitemap.xml` found** — 404 response. SEO is not being managed with a sitemap.
- **Article URLs:** `/Article/[numeric-ID]/[arabic-slug]` — ID-based, not date-based
- **Category URLs:** `/Category/[arabic-category-name]` — Arabic in the URL path
- **~800+ articles estimated** from homepage content density
- **No sitemap = no authoritative URL inventory.** Must get a DB dump to know total article count.

---

## Part 1 — iktissadonline.com: Drupal 7 → Supabase

### 1.1 Articles — Field Mapping

| Drupal Field | Drupal Table | New DB Column | Status |
|---|---|---|---|
| `n.title` | `node` | `articles.title` | ✅ Migrated |
| `ia.subtitle` | `ikt_article` | `articles.excerpt` (fallback) | ✅ Migrated |
| `b.body_value` | `field_data_body` | `articles.content` | ✅ Migrated |
| `b.body_summary` | `field_data_body` | `articles.excerpt` (primary) | ✅ Migrated |
| `fm.uri` (thumbnail) | `file_managed` | `articles.featured_image` | ⚠️ Still old site URLs |
| `promo_uri` (promoted image) | `field_data_iktarticle_promoted_image` | `articles.featured_image` | ⚠️ Only in `migrate-from-drupal.mjs`, not script 4 |
| `ia.featured_article` | `ikt_article` | `articles.featured` | ⚠️ Only via separate script 5 |
| `ia.article_edit_choice` | `ikt_article` | `articles.editor_choice` | ⚠️ Only via separate script 5 |
| `ua.alias` | `url_alias` | `articles.slug` | ✅ Migrated |
| `n.status` | `node` | `articles.status` | ✅ Migrated |
| `ia.articledate` | `ikt_article` | `articles.published_at` | ✅ Migrated |
| `n.created` | `node` | `articles.created_at` | ✅ Migrated |
| `n.changed` | `node` | `articles.updated_at` | ✅ Migrated |
| `n.uid` (author) | `node` | `articles.author_id` | ❌ NEVER SET — all NULL |
| `iktarticle_sector_taxo_tid` | `field_data_iktarticle_sector_taxo` | `articles.sector_id` | ⚠️ Partial — see sector gaps below |
| `iktarticle_subjects_taxo_tid` | `field_data_iktarticle_subjects_taxo` | `articles.section_id` | ⚠️ Scripts use different field names |
| `iktarticle_countries_taxo_tid` | `field_data_iktarticle_countries_taxo` | `articles.country_id` | ⚠️ Coverage narrow — see country gaps |
| `field_iktarticle_tags_tid` | `field_data_field_iktarticle_tags` | `articles.tags[]` | ✅ Migrated |

---

### 1.2 Magazine Issues — Field Mapping

| Drupal Field | Drupal Table | New DB Column | Status |
|---|---|---|---|
| `ii.issueNumber` | `ikt_issue` | `magazine_issues.issue_number` | ✅ Migrated |
| `n.title` | `node` | `magazine_issues.title` | ✅ Migrated |
| `ii.publishingDate` | `ikt_issue` | `magazine_issues.publish_date` | ✅ Migrated |
| `ii.numberOfPages` | `ikt_issue` | `magazine_issues.pages` | ✅ Migrated |
| `fmcover.uri` | `file_managed` | `magazine_issues.cover_image` | ⚠️ Still old site URL |
| `fmpdf.uri` | `file_managed` | `magazine_issues.pdf_url` | ⚠️ Still old site URL |
| `n.status` | `node` | `magazine_issues.status` | ✅ Migrated |
| Article↔Issue relationships | node references | `magazine_articles` junction | ❌ NOT MIGRATED AT ALL |

---

### 1.3 URL Structure & Redirect Strategy (Critical — SEO Impact)

**Confirmed from sitemap:** All ~800 public article URLs follow:
```
https://www.iktissadonline.com/news/YYYY/MM/DD/[arabic-slug]
```

**Current new platform slug format:** `articles.slug` is migrated from Drupal's `url_alias` — likely just the slug portion (e.g., `اسم-المقال`), without the `/news/YYYY/MM/DD/` prefix.

**Problem:** If the new site routes articles at `/articles/[slug]` or `/[slug]`, all 800+ indexed URLs will 404 → complete SEO wipeout.

**Required fix — Option A (Recommended): Match old URL structure**
Add a route in Next.js at `app/news/[year]/[month]/[day]/[slug]/page.tsx` that fetches by slug and renders the article. Store the full path in a `legacy_url` column or derive it from `published_at + slug`.

**Option B: 301 Redirects**
In `next.config.ts`, generate redirects from `/news/YYYY/MM/DD/slug` → `/articles/slug`. Feasible at ~800 URLs but needs the date-to-article mapping extracted from Drupal.

**Action:**
- [ ] Add `legacy_url TEXT` column to `articles` to store the original `/news/YYYY/MM/DD/slug` path
- [ ] Populate from Drupal `url_alias` table during migration
- [ ] Implement Next.js route or redirect

---

### 1.4 Content Types NOT Covered in Migration (Discovered from Live Site)

The live site at iktissadonline.com has content types that were **never included** in the migration audit or any migration script:

#### Rankings & Reports
The live site publishes annual ranked lists that are distinct content types — not regular articles:
- **Top 1000 Arab Companies** (annual ranking with financial data per company)
- **Top 200 Arab Banks** (annual ranking)
- **Saudi Listed Companies** (ranking)
- **Lebanese Banking Sector Analysis** (report)
- **Research & Studies** (دراسات وتقارير) — separate section

These are likely stored in dedicated Drupal content types (e.g., `ikt_ranking`, `ikt_report`). None have been audited, mapped, or migrated.

**Action required:** Audit Drupal DB for ranking/report content types and decide: (a) migrate into existing `articles` table with a `content_type` discriminator, or (b) create a new `rankings` table.

#### Profiles / People & Business (رجال وأعمال)
Executive profiles are a separate content type in Drupal. Not audited or migrated.

#### Additional Publications
The live site hosts **3 publications**, not 1:
- **Al-Iktissad Wal-Aamal** ← current `magazine_issues` table covers this
- **Al-Hasnaa** (الحسناء) — separate magazine, NOT migrated
- **Al-Defaiya** (الدفاعية) — separate magazine, NOT migrated

These likely have their own Drupal node types. A separate `publications` or `magazine_series` table may be needed.

#### Group Activities (أنشطة المجموعة)
A section covering the media group's own events, conferences, and activities. Not audited.

---

### 1.4 Taxonomy Gaps — Live Site vs DB

#### Sectors (16 on live site, 6 in DB)
The live iktissadonline.com has **16 sectors**. `migrate-from-drupal.mjs` does upsert sectors directly from Drupal taxonomy (dynamic, not hardcoded), so if that script ran, sectors may be populated. Verify with a COUNT query. Missing sectors confirmed from live site:

| Sector (Arabic) | Sector (English) | In DB? |
|---|---|---|
| اقتصاد عام | General Economy | ❓ Verify |
| بيئة | Environment | ❌ Missing from original seed |
| تعليم | Education | ❌ Missing from original seed |
| صحة | Health | ❌ Missing from original seed |
| مال ومصارف | Finance & Banking | ❓ Verify (≈ `banking`) |
| مجتمع | Society | ❌ Missing from original seed |
| طاقة | Energy | ✅ |
| نفط وغاز | Oil & Gas | ✅ `oil-gas` |
| طاقة متجددة | Renewable Energy | ❓ Verify |
| كهرباء | Electricity | ❓ Verify |
| سياحة وطيران | Tourism & Aviation | ✅ `aviation` (incomplete — missing tourism) |
| عقار وإنشاءات | Real Estate & Construction | ✅ `real-estate` |
| سيارات ومحركات | Automobiles | ❌ Missing from original seed |
| النقل واللوجستيات | Transport & Logistics | ❌ Missing from original seed |
| ساعات ورفاهية | Watches & Luxury | ❌ Missing from original seed |
| تكنولوجيا | Technology | ✅ |

**Query to run:** `SELECT slug, name FROM sectors ORDER BY name;`

#### Countries — Confirmed Coverage from Live Site

The live site covers **4 regions + global**. Original DB had only 5 countries. Full required list:

**Gulf (خليج):** UAE ✅, Bahrain ❌, Saudi Arabia ✅, Oman ❌, Qatar ❌, Kuwait ✅, Yemen ❌

**Levant (مشرق):** Syria ❌, Iraq ❌, Jordan ❌, Lebanon ✅, Palestine ❌

**North Africa (أفريقيا الشمالية):** Tunisia ❌, Algeria ❌, Sudan ❌, Libya ❌, Egypt ✅, Morocco ❌, Mauritania ❌

**Global (noted in live site — add key ones):** USA, China, UK, EU, Turkey, India, Russia, Germany, France, Spain, Italy, Greece, Japan, Iran, Cyprus

**Query to run:** `SELECT slug, name FROM countries ORDER BY name;`

---

### 1.5 Migration Script Conflicts

| Issue | Detail |
|---|---|
| Two overlapping article scripts | `4-migrate-articles.js` and `migrate-from-drupal.mjs` both migrate articles. `articles-progress.json` tracks node IDs processed by script 4. Confirm which was actually used to avoid double-inserts. |
| Section field name divergence | Script 4 queries `field_data_iktarticle_subjects_taxo`; `migrate-from-drupal.mjs` queries `field_data_field_iktarticle_sections`. These may be different Drupal fields. |
| `featured`/`editor_choice` slug mismatch | Script 5 (`5-sync-flags.js`) uses a different slug formula than `migrate-from-drupal.mjs`. Use Drupal `nid` as stable match key instead. |
| Image URLs | `featured_image` values still point to `https://www.iktissadonline.com/sites/default/files/...`. Script `2-migrate-to-supabase.js` and `2-upload-images.js` both exist — confirm which is correct. Must run on Windows/Lightsail server while old site is live. |

---

### 1.6 Fields That Don't Exist in Drupal (New-Only — Safe to Leave Empty)

| New Field | Default | Notes |
|---|---|---|
| `title_en` | `''` | Drupal was Arabic-only |
| `excerpt_en` | `''` | Drupal was Arabic-only |
| `content_en` | `''` | Drupal was Arabic-only |
| `featured_image_focal_x/y` | `null` | New smart-crop feature |
| `is_paywalled` | `false` | New subscription feature |
| `is_breaking` | `false` | New feature |
| `articles.views` | `0` | Drupal views not exported |
| `magazine_issues.subtitle` | `''` | Not in Drupal |
| `magazine_issues.highlights` | `[]` | Not in Drupal |
| `magazine_issues.views` | `0` | Not exported |
| `magazine_issues.downloads` | `0` | Not exported |

---

### 1.7 Action Items — iktissadonline.com (Priority Order)

**P0 — Verify current state (run before anything else)**
- [ ] `SELECT COUNT(*) FROM articles;` — confirm total migrated
- [ ] `SELECT COUNT(*) FROM articles WHERE author_id IS NULL;`
- [ ] `SELECT COUNT(*) FROM articles WHERE sector_id IS NULL;`
- [ ] `SELECT COUNT(*) FROM articles WHERE country_id IS NULL;`
- [ ] `SELECT COUNT(*) FROM articles WHERE section_id IS NULL;`
- [ ] `SELECT COUNT(*) FROM articles WHERE featured_image = '' OR featured_image IS NULL;`
- [ ] `SELECT slug, name FROM sectors ORDER BY name;`
- [ ] `SELECT slug, name FROM countries ORDER BY name;`
- [ ] Spot-check 10 random articles for content, tags, slug correctness

**P1 — Fix broken data**
- [ ] Insert all missing sectors (up to 16 total) into `sectors` table
- [ ] Insert all Arab world + key global countries into `countries` table
- [ ] Export Drupal `users` table → insert into Supabase `users` → re-run article migration with `author_id`
- [ ] Confirm correct Drupal section field name (`subjects_taxo` vs `sections`) and standardize
- [ ] Verify `migrate-from-drupal.mjs` was used (not script 4) to avoid double-inserts

**P2 — Missing relationships & content types**
- [ ] Write script to migrate `magazine_articles` junction (issue ↔ article links)
- [ ] Audit Drupal DB for ranking content type → decide table strategy → write migration script
- [ ] Audit Drupal DB for Al-Hasnaa and Al-Defaiya magazine nodes → migrate to new `magazine_series` or add `series` column to `magazine_issues`
- [ ] Audit and migrate Profiles/People & Business content type

**P3 — Images (must run while old site is live)**
- [ ] Run image upload script on Windows/Lightsail server
- [ ] Confirm which script to use: `2-migrate-to-supabase.js` or `2-upload-images.js`
- [ ] After upload, update `articles.featured_image` and `magazine_issues.cover_image` to Supabase Storage URLs

**P4 — Flags**
- [ ] Fix slug formula mismatch in `5-sync-flags.js` (use `nid` as match key)
- [ ] Re-run flag sync after fix

---

---

## Part 2 — awalan.com: .NET → Next.js / Supabase

> awalan.com is a separate Arabic financial news portal that needs to be migrated.
> The new design platform (Next.js + Supabase) already built for iktissad can serve as the target.

---

### 2.1 Site Inventory (from live site)

**URL:** https://awalan.com
**Language:** Arabic (RTL)
**Tech stack:** .NET (backend), likely SQL Server (database), custom image resize API

#### Navigation / Content Taxonomy

**Sectors (14):**
Banking, Energy, Investments, Telecommunications, Automobiles, Transportation, Manufacturing, Agriculture, Retail, Watches & Luxury, Real Estate, Tourism, Sports, Petrochemicals

**Countries (30):**
Yemen, USA, UK, Turkey, Tunisia, Syria, Oman, Sudan, Spain, Russia, Palestine, Morocco, Libya, Saudi Arabia, Bahrain, Italy, Iran, India, Greece, Germany, France, Cyprus, China, Algeria, UAE, Egypt, Lebanon, Qatar, Kuwait, Jordan

**Sections (unique to awalan — not in iktissad):**
- Financial Markets (أسواق مالية) — Gulf Stock Exchange, Saudi Market, Egyptian Market, Global Markets
- Economy (اقتصاد)
- Files/Dossiers (ملفات)
- Companies (شركات) → Appointments (تعيينات), Startups (شركات ناشئة)
- Technology (تكنولوجيا) → Fintech, Cybersecurity, Autonomous Driving, Blockchain, Digital Currencies, Telecom, Digital Transformation
- Green Economy (الاقتصاد الأخضر)
- Entrepreneurship (ريادة) → Interviews, Profiles
- Opinion (رأي)
- Video
- Under the Microscope (تحت المجهر)
- Breaking News (أخبار أولاً)

---

### 2.2 Technical Infrastructure (from live site)

| Component | Detail |
|---|---|
| Article URL pattern | `/Article/[ID]/[Arabic-slug]` — numeric ID + slug |
| Image base URL | `api.awalan.com/Content/uploads/articles/` |
| Image resize API | `api.awalan.com/Images/220x147xi/[path]` — server-side resize |
| Analytics | Google Tag Manager `GTM-WBMMBBT` |
| Ad network | Google AdSense `ca-pub-6145231867327513`, Google Publisher Tag (GPT) |
| Ad slots | 29 defined slots: 320x50 (mobile), 728x90, 970x90 (desktop leaders), 300x250, 300x600 (rectangles) |
| Social | Facebook, Twitter, Instagram, LinkedIn, YouTube |
| Schema | Organization schema.org markup |

---

### 2.3 Field Mapping — awalan.com → Supabase

> Best-guess mapping based on observed site structure. Requires .NET DB schema access to confirm.

| awalan Field | Source | Target DB Column | Notes |
|---|---|---|---|
| Article ID | `[ID]` in URL | `articles.drupal_id` or new `awalan_id` | Keep for URL redirect mapping |
| Title (Arabic) | article page | `articles.title` | Primary title field |
| Slug | URL slug portion | `articles.slug` | Strip Arabic from `/Article/[ID]/[slug]` |
| Content | article body | `articles.content` | HTML likely, convert to clean HTML |
| Excerpt | homepage/listing summary | `articles.excerpt` | 50-200 chars observed |
| Featured image | `api.awalan.com/...` | `articles.featured_image` | Must download and re-upload to Supabase Storage |
| Category/Sector | nav taxonomy | `articles.sector_id` | Map to `sectors` table |
| Country | country tag | `articles.country_id` | Map to `countries` table |
| Section | section taxonomy | `articles.section_id` | Map to `sections` table |
| Published date | metadata | `articles.published_at` | Extract from .NET DB |
| Author | byline | `articles.author_id` → `users` table | Create author records |
| Tags | article tags | `articles.tags[]` | Array of strings |
| Article type | opinion/video/breaking | `articles.content_type` or tag | New discriminator field needed |
| Views count | .NET analytics | `articles.views` | Nice to have |

---

### 2.4 Content Types Unique to awalan.com

These don't exist in the current Supabase schema and need decisions before migration:

#### Financial Markets Data
Real-time/daily stock market data (Gulf, Saudi, Egyptian, Global exchanges). This is **live data**, not archived articles.

**Decision needed:** Is this content migrated as historical snapshots? Or does the new site pull it from a market data API (e.g., Tadawul API, Mubasher)?

#### Video Content
awalan.com has a Video section. Videos are likely YouTube embeds or hosted files.

**Decision needed:** Add a `video_url` field to `articles` with a `content_type = 'video'` discriminator, or create a separate `videos` table?

#### Opinion Section (رأي)
Column/opinion pieces with author bylines. Could use existing `articles` table with `content_type = 'opinion'`.

#### Dossiers / Files (ملفات)
Longer-form editorial dossiers grouping multiple articles. Similar to a series. No equivalent in current schema.

#### Companies — Appointments (تعيينات)
Executive appointment announcements — a structured content type with person name, title, company, effective date. Not suitable for the articles table as-is.

#### Companies — Startups
Startup profiles/news. Could be regular articles with a sector tag.

#### Breaking News (أخبار أولاً)
Flash news items. Could map to `articles.is_breaking = true`.

#### Under the Microscope (تحت المجهر)
In-depth investigative/analysis pieces. Tag-based discrimination would work.

---

### 2.5 URL Redirect Strategy

**Confirmed from sitemap analysis:**
- awalan.com has **no sitemap.xml** (404) — so total article count is unknown, only DB can confirm
- Article URLs: `/Article/[numeric-ID]/[arabic-slug]` (confirmed from live homepage links, e.g. `/Article/23804/...`)
- Category URLs: `/Category/[arabic-category-name]` — Arabic in URL path (e.g., `/Category/قطاعات`)

**SEO Risk:** awalan.com has no sitemap so Google may have indexed URLs inconsistently. However, numeric-ID URLs are stable and must be preserved.

**Options:**
1. **Maintain same URL structure (Recommended)** — Add Next.js routes:
   - `app/Article/[id]/[slug]/page.tsx` — looks up article by `source_id`, renders it. Zero redirects needed, all existing links/bookmarks work.
   - `app/Category/[name]/page.tsx` — category listing page using Arabic category names
2. **301 redirect + new clean URLs** — Only if you want a clean URL scheme for the new brand. Higher SEO risk.

**Recommended:** Option 1 — preserve existing URL structure exactly. Add `source_id INTEGER` column to `articles` and implement the matching Next.js dynamic routes.

**Category URL consideration:** Arabic in URL paths (`/Category/قطاعات`) is valid but some CDNs/proxies struggle with it. The new Next.js app already uses Arabic-aware slugs, so this is consistent.

---

### 2.6 Image Migration Strategy

awalan.com images are served from `api.awalan.com` with server-side resizing. During migration:

1. Identify all unique image paths from the .NET database
2. Download originals (not resized versions) from `api.awalan.com/Content/uploads/articles/`
3. Upload to Supabase Storage bucket `articles`
4. Update `articles.featured_image` to new Supabase Storage URLs
5. Use `next/image` for all resizing on the new platform (replaces the `api.awalan.com/Images/` resize service)

---

### 2.7 Schema Changes Required for awalan.com Migration

The following additions to the existing Supabase schema are needed to accommodate awalan.com:

```sql
-- Add awalan source tracking to articles
ALTER TABLE articles ADD COLUMN IF NOT EXISTS source_site TEXT; -- 'iktissad' | 'awalan'
ALTER TABLE articles ADD COLUMN IF NOT EXISTS source_id INTEGER; -- original numeric ID (awalan_id)
ALTER TABLE articles ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'article';
  -- values: 'article' | 'opinion' | 'video' | 'breaking' | 'analysis' | 'profile'

-- Add video support
ALTER TABLE articles ADD COLUMN IF NOT EXISTS video_url TEXT;

-- New: dossiers (ملفات) — grouped article collections
CREATE TABLE IF NOT EXISTS dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  cover_image TEXT,
  published_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dossier_articles (
  dossier_id UUID REFERENCES dossiers(id) ON DELETE CASCADE,
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  PRIMARY KEY (dossier_id, article_id)
);

-- New: appointments (executive appointment announcements)
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_name TEXT NOT NULL,
  new_title TEXT NOT NULL,
  company TEXT NOT NULL,
  sector_id UUID REFERENCES sectors(id),
  country_id UUID REFERENCES countries(id),
  effective_date DATE,
  notes TEXT,
  source_site TEXT DEFAULT 'awalan',
  source_id INTEGER,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 2.8 Migration Script Plan — awalan.com

> Requires access to the .NET server or a database dump. Confirm DB type (SQL Server / MySQL / PostgreSQL).

| Script | Purpose | Dependency |
|---|---|---|
| `awalan-1-export.js` | Connect to .NET DB, export articles/authors/taxonomy to JSON | .NET DB access or dump |
| `awalan-2-migrate-taxonomy.js` | Insert awalan sectors/countries/sections into Supabase (merge with existing) | Script 1 |
| `awalan-3-migrate-authors.js` | Insert awalan authors into `users` table (or merge with existing) | Script 1 |
| `awalan-4-migrate-articles.js` | Insert articles with `source_site='awalan'`, `source_id=original_id` | Scripts 2, 3 |
| `awalan-5-migrate-appointments.js` | Insert appointment records into `appointments` table | Script 1 |
| `awalan-6-upload-images.js` | Download from `api.awalan.com`, upload to Supabase Storage | Script 4 |
| `awalan-7-redirects.js` | Generate redirect map or verify ID-based routes work | Script 4 |

---

### 2.9 Open Questions — awalan.com

These must be answered before writing migration scripts:

| # | Question | Impact |
|---|---|---|
| 1 | What .NET database engine? (SQL Server / MySQL / SQLite) | Determines connection driver for export script |
| 2 | Is server access available, or do we get a DB dump? | Determines export approach |
| 3 | What is the approximate article count? | Determines batch strategy |
| 4 | Do awalan.com and iktissadonline.com share the same Next.js app, or separate deployments? | Determines routing, branding, multi-tenancy |
| 5 | Should awalan articles appear in iktissad search, or stay siloed? | Determines `source_site` filtering in queries |
| 6 | Does awalan.com have user accounts / subscriptions to migrate? | Extra `users` table complexity |
| 7 | Financial Markets section — live data feed or archived? | Determines if we need a market data API integration |
| 8 | Are awalan.com videos self-hosted or YouTube embeds? | Determines `video_url` format |
| 9 | What ad configuration does awalan.com use? Same AdSense account? | Determines ad slot setup in new app |
| 10 | Are there any paywalled articles or subscription tiers on awalan.com? | Determines `is_paywalled` usage |

---

---

## Part 3 — Shared Infrastructure Changes

### 3.1 Sectors — Unified Taxonomy (both sites)

After merging both sites, the unified `sectors` table needs to cover both:

**Combined unique sectors (21 total):**

| # | Arabic | English Slug |
|---|---|---|
| 1 | اقتصاد عام | `general-economy` |
| 2 | مال ومصارف | `banking` |
| 3 | طاقة | `energy` |
| 4 | نفط وغاز | `oil-gas` |
| 5 | طاقة متجددة | `renewable-energy` |
| 6 | كهرباء | `electricity` |
| 7 | تكنولوجيا | `technology` |
| 8 | عقار وإنشاءات | `real-estate` |
| 9 | سياحة وطيران | `tourism-aviation` |
| 10 | سيارات ومحركات | `automotive` |
| 11 | النقل واللوجستيات | `transport` |
| 12 | ساعات ورفاهية | `luxury` |
| 13 | بيئة | `environment` |
| 14 | تعليم | `education` |
| 15 | صحة | `health` |
| 16 | مجتمع | `society` |
| 17 | استثمارات | `investments` |
| 18 | اتصالات | `telecommunications` |
| 19 | تصنيع | `manufacturing` |
| 20 | زراعة | `agriculture` |
| 21 | بتروكيماويات | `petrochemicals` |

### 3.2 Countries — Unified List

Combined required countries (38 total): All Arab League countries + key global markets.

| Region | Countries |
|---|---|
| Gulf | Saudi Arabia, UAE, Kuwait, Qatar, Bahrain, Oman, Yemen |
| Levant | Lebanon, Jordan, Syria, Iraq, Palestine |
| North Africa | Egypt, Morocco, Algeria, Tunisia, Libya, Sudan, Mauritania |
| Other Arab | Djibouti, Somalia, Comoros |
| Global | USA, UK, China, Turkey, India, Russia, Germany, France, Spain, Italy, Greece, Cyprus, Iran, Japan, EU |

### 3.3 Multi-Site Architecture Decision

**Option A — Single app, single DB, `source_site` column**
- One Next.js app serves both brands (with theme switching by domain/subdomain)
- Articles tagged with `source_site = 'iktissad' | 'awalan'`
- Pros: one codebase, shared auth, shared admin, shared search
- Cons: branding complexity, tighter coupling

**Option B — Two deployments, same Supabase DB**
- Two separate Next.js deployments (iktissad.vercel.app, awalan.vercel.app)
- Shared Supabase instance, `source_site` filtering on every query
- Pros: independent branding, independent deploys
- Cons: duplicated frontend code, two admin panels

**Option C — Two fully independent deployments + DBs**
- Nothing shared
- Pros: maximum isolation
- Cons: double the maintenance, no content sharing

**Recommendation:** Option B — same Supabase DB (unified taxonomy, no duplicate sectors/countries), separate Next.js apps. Use a shared `packages/` monorepo for common UI components.

---

## Part 4 — Migration Progress Tracker

### iktissadonline.com

| Task | Status | Owner |
|---|---|---|
| Sectors taxonomy | ⚠️ Partial | Verify with DB query |
| Countries taxonomy | ⚠️ Partial | Need 33+ more |
| Sections taxonomy | ⚠️ Unknown | Verify field name first |
| Articles (content + slug) | ✅ In progress | `articles-progress.json` tracks node IDs |
| Article → author_id | ❌ Not done | Need user export |
| Article → sector_id | ⚠️ Partial | Depends on sector gaps |
| Article → country_id | ⚠️ Partial | Depends on country gaps |
| Article → section_id | ⚠️ Unknown | Depends on field name fix |
| Featured/editor flags | ❌ Not done | Script 5 has slug bug |
| Magazine issues | ✅ Done | |
| Magazine ↔ Article links | ❌ Not done | |
| Image upload | ❌ Not done | Needs Windows server |
| Rankings/reports | ❌ Not audited | |
| Al-Hasnaa magazine | ❌ Not audited | |
| Al-Defaiya magazine | ❌ Not audited | |
| Profiles content type | ❌ Not audited | |

### awalan.com

| Task | Status | Owner |
|---|---|---|
| DB access / dump | ❓ Pending | Need server credentials |
| Schema changes (source_site, content_type, etc.) | ❌ Not done | |
| Taxonomy export + merge | ❌ Not done | After DB access |
| Author migration | ❌ Not done | After DB access |
| Article migration | ❌ Not done | After DB access |
| Appointment records | ❌ Not done | After DB access |
| Image download + re-upload | ❌ Not done | After article migration |
| URL redirect strategy | ❌ Not decided | See §2.5 |
| Open questions resolved | ❌ 10 open | See §2.9 |
