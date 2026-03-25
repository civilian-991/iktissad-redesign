# Magazine System — Iktissad Digital Magazine 2026

**Goal:** A Magzter-style digital magazine. Admin uploads one PDF → system converts it to page images → stored on Supabase CDN → reader gets a fast image-based flipbook → subscribers read everything, free users hit a paywall after page 3.

**Last updated:** 2026-03-24
**Status:** Planning complete, implementation starting

---

## Architecture Decision

**Approach: Admin-browser PDF → WebP images (Magzter pattern)**

When admin uploads a PDF:
1. `pdfjs-dist` (already installed) loads the PDF in the admin's browser
2. Each page is rendered to a canvas at 1.5× scale and exported as WebP
3. Each page image is uploaded to Supabase Storage: `magazines/pages/{issueId}/page-001.webp`
4. The array of image URLs is stored in `magazine_issues.pages_images[]`
5. The reader loads images only — no PDF parsing, no CORS, works everywhere

The original PDF is still kept for the download button (subscribers only).

**Why not server-side?**
Ghostscript/Poppler can't run on Vercel. Cloudinary costs money. The admin-browser approach needs zero new services, uses what's already installed, and runs once per issue.

---

## Current State Audit

### What's built and working
- ✅ `magazine_issues` table with full metadata
- ✅ `magazine_articles` junction table (articles linked to issues)
- ✅ `magazine_spreads` + `spread_templates` (web-native CMS builder — separate system, leave alone)
- ✅ Admin list page `/admin/magazines` — lists issues, delete, filter
- ✅ Admin new issue page `/admin/magazines/new` — create with PDF upload
- ✅ Admin edit page `/admin/magazines/[id]` — edit metadata, replace PDF
- ✅ Admin spread builder `/admin/magazines/[id]/spreads` — visual layout editor
- ✅ Admin kanban board `/admin/magazines/[id]/board` — editorial workflow
- ✅ Public magazine hub `/magazine` — archive grid + featured issue
- ✅ `FeaturedMagazine.tsx` homepage component — latest issue showcase
- ✅ `PaywallModal.tsx` — fully built, 2 modes, not yet wired
- ✅ Subscription tables — `subscription_plans`, `subscribers`, `payments` (DB only, no payment gateway)
- ✅ `pdfjs-dist` and `react-pageflip` packages installed
- ✅ Supabase Storage `uploadFile()` utility ready

### What's broken / missing
- ❌ `/magazine/[id]/browse` — downloads full PDF in every reader's browser (wrong approach)
- ❌ `magazine_issues` has no `pages_images[]` or `pages_ready` fields
- ❌ Paywall not wired to subscription check
- ❌ `/subscribe` page doesn't exist
- ❌ Old issues (201) still point to `iktissadonline.com` — if that server goes down, all covers break
- ❌ Supabase Storage bucket `magazines` not created yet (blocks all uploads)

### Known bugs
- 🐛 `magazine_articles` API query uses `.eq("magazine_id", id)` but column is `magazine_issue_id` → articles never load for any issue (partially fixed in task #1)

---

## Build Plan

### Phase 1 — Database migration
**Status: `pending`**

Add two columns to `magazine_issues`:

```sql
ALTER TABLE magazine_issues
  ADD COLUMN pages_images TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN pages_ready  BOOLEAN NOT NULL DEFAULT FALSE;
```

Also fix the `magazine_articles` junction table column bug:
```sql
-- Verify actual column name in prod
SELECT column_name FROM information_schema.columns
WHERE table_name = 'magazine_articles';
```

**Files to create/change:**
- `supabase/migrations/YYYYMMDD_magazine_pages_images.sql` — new migration
- `src/types/index.ts` — add `pagesImages: string[]` and `pagesReady: boolean` to `MagazineIssue`
- `src/lib/supabase/mappers.ts` — map `pages_images` → `pagesImages`, `pages_ready` → `pagesReady`
- `src/app/api/magazines/route.ts` — include new fields in select
- `src/app/api/magazines/[id]/route.ts` — include new fields + fix `magazine_id` → `magazine_issue_id`

---

### Phase 2 — Admin upload: PDF → page images
**Status: `pending`**

Replace the current "upload PDF → store URL" step with a full conversion pipeline.

**New flow in admin new/edit pages:**

```
Admin selects PDF file
  → pdfjs opens the file locally (no upload yet)
  → renders page 1 + 2 → shows preview immediately
  → background: renders all pages sequentially
  → each page: canvas.toBlob('image/webp', 0.88) → uploadFile('magazines', blob, `pages/${issueId}`)
  → updates pages_images[] in DB after each batch of 5
  → progress: "جاري التحويل... 12 / 84 صفحة"
  → when done: pages_ready = true
  → original PDF also uploaded → pdf_url stored (for download)
```

**UI state machine:**
- `idle` — no PDF selected
- `converting` — pages being rendered and uploaded
- `done` — all pages ready, show page count + thumbnail strip
- `error` — conversion failed, show retry

**Files to change:**
- `src/app/admin/magazines/new/page.tsx` — add PDF conversion pipeline
- `src/app/admin/magazines/[id]/page.tsx` — add reconvert button + same pipeline

**New utility to create:**
- `src/lib/magazine/pdf-to-images.ts` — reusable conversion function

```typescript
// signature
export async function convertPdfToImages(
  pdfFile: File,
  issueId: string,
  onProgress: (current: number, total: number) => void
): Promise<string[]>  // returns array of Supabase public URLs
```

---

### Phase 3 — New image-based reader
**Status: `pending`**

Full rewrite of `/magazine/[issueId]/browse/PageClient.tsx`.

**New reader behaviour:**
- Fetches `pages_images[]` from `/api/magazines/[id]`
- If `pages_ready = false` → show "هذا العدد قيد التحضير" message (or fallback to PDF reader for old issues)
- If `pages_ready = true` → load image flipbook
- `react-pageflip` fed with `<img>` tags (not canvas renders)
- Pre-loads current spread + 2 spreads ahead using browser's native image pre-loading
- Thumbnail grid (already exists, just swap canvas for img)
- Progress scrubber (already exists, keep it)

**Paywall logic in reader:**
```
props.isSubscriber = true  → all pages unlocked
props.isSubscriber = false → pages 1–3 visible, page 4+ shows PaywallModal
props.freePages = 3        → configurable
```

**Files to change:**
- `src/app/magazine/[issueId]/browse/page.tsx` — server component: fetch issue + check subscription
- `src/app/magazine/[issueId]/browse/PageClient.tsx` — full rewrite

---

### Phase 4 — Paywall wiring
**Status: `pending`**

The `PaywallModal` component is built but wired to nothing.

**Server-side subscription check** (in `browse/page.tsx`):
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

let isSubscriber = false
if (user) {
  const { data: sub } = await supabase
    .from('subscribers')
    .select('status')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing'])
    .maybeSingle()
  isSubscriber = !!sub
}
```

Pass `isSubscriber` as prop to `PageClient`. Gate pages in client component.

**Files to change:**
- `src/app/magazine/[issueId]/browse/page.tsx` — add auth + subscriber check

---

### Phase 5 — Old issues (201 PDFs from Drupal)
**Status: `pending`**

Old issues have `pages_ready = false` (no images converted yet). Two approaches:

**Immediate (ship fast):** Fallback to old PDF reader when `pages_ready = false`
- Old issues still work via the PDF reader (current system)
- New issues use the image reader
- No paywall on old issues (they're legacy content)

**Later (batch conversion):** Admin can trigger per-issue conversion
- Button in `/admin/magazines/[id]`: "تحويل صفحات العدد"
- Runs the same Phase 2 pipeline on the existing `pdf_url`
- Starts from most recent issues, works backwards

**Files to change:**
- `src/app/admin/magazines/[id]/page.tsx` — add "تحويل العدد" button

---

### Phase 6 — Subscribe page (separate stream)
**Status: `not started` — lower priority`**

The subscription DB is ready. The missing pieces:
- `/subscribe` page — display plans from `subscription_plans` table, pricing cards
- Payment integration — Stripe or local gateway webhook handler (stub exists at `/api/webhooks/payment`)
- Post-payment — webhook creates `subscribers` row with `status: 'active'`
- `/account/subscription` page — manage subscription, cancel, invoices

This is a separate stream of work. The paywall UI already exists — users just can't pay yet.

---

## Supabase Storage Setup (manual step — do this first)

Before any uploads work, create these buckets in Supabase dashboard:

| Bucket | Public | Purpose |
|--------|--------|---------|
| `magazines` | ✅ Yes | Cover images, PDFs, page images |

Folder structure inside `magazines`:
```
magazines/
  covers/          ← cover images (already used)
  pdfs/            ← original PDFs (already used)
  pages/{issueId}/ ← NEW: page-001.webp, page-002.webp, ...
```

---

## Progress Tracker

| Phase | Task | Status | Notes |
|-------|------|--------|-------|
| Pre | Create Supabase `magazines` bucket | ⬜ pending | Manual, do first |
| Pre | Fix `magazine_id` → `magazine_issue_id` bug | 🔄 in progress | Already patched in API route |
| 1 | DB migration: `pages_images[]`, `pages_ready` | ⬜ pending | |
| 1 | Update `MagazineIssue` type | ⬜ pending | |
| 1 | Update mapper + API routes | ⬜ pending | |
| 2 | Create `src/lib/magazine/pdf-to-images.ts` | ⬜ pending | Core conversion utility |
| 2 | Admin new page — PDF conversion pipeline | ⬜ pending | |
| 2 | Admin edit page — PDF conversion + reconvert button | ⬜ pending | |
| 3 | Browse page server component — subscription check | ⬜ pending | |
| 3 | Browse PageClient — image reader (full rewrite) | ⬜ pending | |
| 4 | Wire PaywallModal to subscription status | ⬜ pending | |
| 5 | Old issues — fallback to PDF reader | ⬜ pending | |
| 5 | Old issues — "تحويل العدد" button in admin | ⬜ pending | |
| 6 | `/subscribe` page | ⬜ not started | Separate stream |
| 6 | Payment gateway | ⬜ not started | Separate stream |

**Legend:** ⬜ pending · 🔄 in progress · ✅ done · ❌ blocked

---

## Open Questions

1. **Free pages count** — how many pages can non-subscribers see? (Recommended: 3)
2. **Old issues paywall** — should 201 old Drupal issues be free forever or paywalled after conversion?
3. **Image resolution** — 1.5× scale is ~1400px wide per page. Enough? Want higher for zoom?
4. **Mobile** — single-page view on mobile, two-page spread on desktop?
5. **Payment gateway** — which one? Stripe? Local Lebanese gateway?

---

## Notes

- The spread builder (`/admin/magazines/[id]/spreads`) is a separate, fully-built system for web-native layouts. Leave it alone — it's not part of this plan.
- `pdf-lib` (installed) is for creating/modifying PDFs, not converting them. Not needed here.
- `puppeteer-core` (installed) could do server-side conversion but can't run on Vercel easily. Skip it.
- The `/magazine/[id]/reader` route uses the spread system. Leave it alone.
