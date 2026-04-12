# Utility: Content Archival

File: `src/lib/archival.ts`

Marks articles older than a configurable threshold as archived. Archived articles remain accessible via direct URL but are excluded from main feeds, search results, and listing pages.

---

## Key exports

| Export | Description |
|--------|-------------|
| `archiveOldArticles(thresholdDays?)` | Archive published articles older than threshold (default: 730 days / 2 years) |
| `unarchiveArticle(articleId)` | Restore an archived article to active status |

---

## Archival logic

1. Calculate cutoff date: `now() - thresholdDays`
2. Query `articles` WHERE `status='published'` AND `archived=false` AND `published_at < cutoff`
3. Batch update: set `archived=true`, `archived_at=now()`
4. Return count of archived articles

---

## Integration points

- `GET /api/articles` — excludes archived by default (use `?includeArchived=true` to include)
- `GET /feed.xml` — excludes archived articles
- `/news-sitemap.xml` — excludes archived articles
- Admin article list — can filter to show archived, with un-archive button

---

## Columns on `articles` table (Phase 10)

| Column | Type | Default |
|--------|------|---------|
| `archived` | BOOLEAN | false |
| `archived_at` | TIMESTAMPTZ | null |

**Index:** `idx_articles_archived` partial WHERE `archived = false`
