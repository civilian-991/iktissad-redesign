# API: Articles

All routes under `/api/articles/` and `/api/comments/` and `/api/editorial-notes/`.

**Auth pattern:** GET is public (RLS filters to published). POST/PUT/DELETE require `requireAuth()` (Supabase session cookie). Writes use `createAdminClient()`.

**Response format:** `{ data: T, pagination?: { page, pageSize, total, totalPages } }` or `{ error: string }`

---

## `/api/articles`

### GET /api/articles
List articles with filtering, pagination, and sorting.

**Query params:**
- `page` (default 1), `pageSize` (default 10)
- `section` (slug), `sector` (slug), `country` (slug)
- `status` (published | draft | review | scheduled)
- `featured` (true/false), `editorChoice` (true/false), `breaking` (true/false)
- `tag` (string), `authorId` (UUID)
- `search` (ilike match on title)
- `sortBy` (date | views | title), `sortFeaturedFirst` (true/false)

**Tables:** articles (SELECT), sections (slug→id), sectors (slug→id), countries (slug→id)  
**Auth:** None required (public, RLS applies)  
**Returns:** `ApiResponse<Article[]>` with pagination

### POST /api/articles
Create a new article.

**Tables:** articles (INSERT), sections/sectors/countries (slug→id lookup)  
**Auth:** Required (admin session via `requireAuth()`)  
**Writes with:** `createAdminClient()` (bypasses RLS)  
**Side effect:** Calls `notifyIndexNow([slug])` if `status === 'published'`  
**Returns:** `ApiResponse<Article>` — HTTP 201  
**Rate-limit headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` (currently stubbed at 100 req/min)

**Request body (Zod-validated, camelCase):**

| Field | Type | Required | Default | Constraints / Notes |
|-------|------|----------|---------|---------------------|
| `title` | `string` | **Yes** | — | Arabic title. min length 1 |
| `slug` | `string` | **Yes** | — | URL slug. min length 1. Must be unique |
| `titleEn` | `string` | No | `""` | English title |
| `excerpt` | `string` | No | `""` | Arabic excerpt |
| `excerptEn` | `string` | No | `""` | English excerpt |
| `content` | `string` | No | `""` | HTML body (legacy TipTap field). Also written here if `body` is a string |
| `contentEn` | `string` | No | `""` | English HTML body |
| `body` | `string \| object \| array` | No | — | TipTap block JSON. If a string is passed, it writes to `content` instead of `body` |
| `deck` | `string` | No | — | Arabic subtitle/kicker → `deck` |
| `deckEn` | `string` | No | — | English deck → `deck_en` |
| `featuredImage` | `string` | No | `""` | Image URL → `featured_image` |
| `featuredImageFocalX` | `number` | No | — | Smart-crop focal X, 0–1 → `featured_image_focal_x` |
| `featuredImageFocalY` | `number` | No | — | Smart-crop focal Y, 0–1 → `featured_image_focal_y` |
| `sectionSlug` | `string` | No | — | Section slug — resolved to UUID → `section_id` |
| `sectorSlug` | `string` | No | — | Sector slug — resolved to UUID → `sector_id` |
| `countrySlug` | `string` | No | — | Country slug — resolved to UUID → `country_id` |
| `authorId` | `string` (UUID) | No | `null` | → `author_id` |
| `tags` | `string[]` | No | `[]` | Array of tag strings |
| `status` | `"published" \| "draft" \| "review" \| "scheduled"` | No | `"draft"` | Article workflow status |
| `publishedAt` | `string` (ISO datetime) | No | `null` | → `published_at` |
| `featured` | `boolean` | No | — | → `featured` |
| `editorChoice` | `boolean` | No | — | → `editor_choice` |
| `isBreaking` | `boolean` | No | — | → `is_breaking` |
| `paywalled` | `boolean` | No | — | → **`is_paywalled`** (column name differs from field name) |
| `article_type` | `"news" \| "report" \| "analysis" \| "interview" \| "opinion"` | No | — | → `article_type` |
| `metaTitle` | `string` | No | — | max 120 chars → `meta_title` (empty string stored as null) |
| `metaDescription` | `string` | No | — | max 320 chars → `meta_description` (empty string stored as null) |
| `ogImage` | `string` (URL) or `""` | No | — | → `og_image` (empty string stored as null) |
| `canonicalUrl` | `string` (URL) or `""` | No | — | → `canonical_url` (empty string stored as null) |
| `noIndex` | `boolean` | No | — | → `no_index` |

**Notable gotchas:**
- `paywalled` → DB column is `is_paywalled` (not `paywalled`)
- `body` as a string → stored in `content`, not `body` JSONB
- Taxonomy fields accept slugs (not UUIDs) — slug→ID resolution happens inside the route via sequential admin queries
- Optional fields omitted from the request body are left to DB defaults (not nulled out), except fields with explicit defaults in the Zod schema (`titleEn`, `excerpt`, etc.) which always write their default

---

## `/api/articles/[id]`

`[id]` accepts either UUID or slug — route detects automatically.

### GET /api/articles/[id]
Fetch single article by UUID or slug.

**Tables:** articles (SELECT + view count UPDATE fire-and-forget)  
**Auth:** None required  
**Returns:** `ApiResponse<Article>` or 404

### PUT /api/articles/[id]
Update article fields (partial — only send changed fields).

**Body:** Same fields as POST, all optional  
**Tables:** articles (UPDATE), sections/sectors/countries (slug→id lookup)  
**Auth:** Required  
**Side effect:** Calls `notifyIndexNow()` if published  
**Returns:** `ApiResponse<Article>` or 404

### DELETE /api/articles/[id]
Hard delete article.

**Tables:** articles (DELETE)  
**Auth:** Required  
**Returns:** `{ data: { success: true } }`

---

## `/api/articles/[id]/status`

### PUT /api/articles/[id]/status
Change article status (transition workflow).

**Body:** `{ status: 'published'|'draft'|'review'|'scheduled', note?: string }`  
**Tables:** articles (UPDATE), article_status_history (INSERT)  
**Auth:** Required

---

## `/api/articles/[id]/versions`

### GET /api/articles/[id]/versions
List version history for an article.

**Tables:** article_versions (SELECT)  
**Auth:** Required

### POST /api/articles/[id]/versions
Save current article state as a named version.

**Tables:** article_versions (INSERT)  
**Auth:** Required

---

## `/api/articles/[id]/versions/[versionId]/restore`

### POST /api/articles/[id]/versions/[versionId]/restore
Restore article content from a saved version.

**Tables:** article_versions (SELECT), articles (UPDATE)  
**Auth:** Required

---

## `/api/comments`

### GET /api/comments
List comments, optionally filtered by articleId and status.

**Tables:** comments (SELECT)  
**Auth:** None (public for approved)

### POST /api/comments
Submit a new comment.

**Tables:** comments (INSERT)  
**Auth:** None (public submission)

---

## `/api/comments/[id]`

### GET /api/comments/[id]
Fetch single comment.

### PUT /api/comments/[id]
Update comment status (moderate: approve, reject, spam).

**Tables:** comments (UPDATE)  
**Auth:** Required (admin)

### DELETE /api/comments/[id]
Delete comment.

**Tables:** comments (DELETE)  
**Auth:** Required

---

## `/api/editorial-notes/[articleId]`

### GET /api/editorial-notes/[articleId]
List all editorial notes for an article.

**Tables:** editorial_notes (SELECT)  
**Auth:** Required

### POST /api/editorial-notes/[articleId]
Add an editorial note to an article.

**Tables:** editorial_notes (INSERT)  
**Auth:** Required

---

## `/api/editorial-notes/[articleId]/[noteId]`

### PUT /api/editorial-notes/[articleId]/[noteId]
Update or resolve an editorial note.

**Tables:** editorial_notes (UPDATE)  
**Auth:** Required

### DELETE /api/editorial-notes/[articleId]/[noteId]
Delete an editorial note.

**Tables:** editorial_notes (DELETE)  
**Auth:** Required
