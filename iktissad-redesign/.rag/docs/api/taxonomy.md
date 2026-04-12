# API: Taxonomy (Sections, Sectors, Countries, Series, Sources, Topics)

Routes for content classification and navigation.

---

## `/api/sections`

### GET /api/sections
List all sections.

**Tables:** sections (SELECT)  
**Auth:** None  
**Returns:** `ApiResponse<Section[]>`

### POST /api/sections
Create a section.

**Body:** `{ slug, name, nameEn?, description?, descriptionEn? }`  
**Tables:** sections (INSERT)  
**Auth:** Required

---

## `/api/sections/[slug]`

### GET /api/sections/[slug]
Get section detail + recent articles.

**Tables:** sections (SELECT), articles (SELECT WHERE section_id=...)  
**Auth:** None

### PUT /api/sections/[slug]
Update section.

**Tables:** sections (UPDATE)  
**Auth:** Required

### DELETE /api/sections/[slug]
Delete section (articles keep section_id→NULL).

**Tables:** sections (DELETE)  
**Auth:** Required

---

## `/api/sectors`

### GET /api/sectors
List all sectors.

**Tables:** sectors (SELECT)  
**Auth:** None

### POST /api/sectors
Create a sector.

**Tables:** sectors (INSERT)  
**Auth:** Required

---

## `/api/sectors/[slug]`

### GET /api/sectors/[slug]
Get sector detail + recent articles.

**Tables:** sectors (SELECT), articles (SELECT)  
**Auth:** None

### PUT /api/sectors/[slug]
Update sector.

### DELETE /api/sectors/[slug]
Delete sector.

---

## `/api/countries`

### GET /api/countries
List all countries.

**Tables:** countries (SELECT)  
**Auth:** None

### POST /api/countries
Create a country entry.

**Tables:** countries (INSERT)  
**Auth:** Required

---

## `/api/countries/[slug]`

### GET /api/countries/[slug]
Get country detail with economic indicators + recent articles.

**Tables:** countries (SELECT), articles (SELECT WHERE country_id=...)  
**Auth:** None

### PUT /api/countries/[slug]
Update country.

### DELETE /api/countries/[slug]
Delete country.

---

## `/api/topics/[slug]`

### GET /api/topics/[slug]
Get articles by topic tag.

**Tables:** articles (SELECT WHERE tags @> [slug])  
**Auth:** None

---

## `/api/series`

### GET /api/series
List all article series.

**Tables:** article_series (SELECT)  
**Auth:** None

### POST /api/series
Create a new series.

**Body:** `{ slug, title, titleEn?, description?, descriptionEn?, coverImage? }`  
**Tables:** article_series (INSERT)  
**Auth:** Required

---

## `/api/series/[slug]`

### GET /api/series/[slug]
Get series detail.

**Tables:** article_series (SELECT)  
**Auth:** None

### PUT /api/series/[slug]
Update series.

**Tables:** article_series (UPDATE)  
**Auth:** Required

### DELETE /api/series/[slug]
Delete series (cascades series_articles junction).

**Tables:** article_series (DELETE)  
**Auth:** Required

---

## `/api/series/[slug]/articles`

### GET /api/series/[slug]/articles
List articles in a series, ordered by order_index.

**Tables:** series_articles (SELECT), articles (JOIN)  
**Auth:** None

### POST /api/series/[slug]/articles
Add article to series.

**Body:** `{ articleId, orderIndex? }`  
**Tables:** series_articles (INSERT)  
**Auth:** Required

---

## `/api/series/by-article`

### GET /api/series/by-article?articleId=...
Find which series an article belongs to.

**Tables:** series_articles (SELECT WHERE article_id=...), article_series (JOIN)  
**Auth:** None

---

## `/api/sources`

### GET /api/sources
List journalist sources.

**Query params:** `search`, `countryId`, `sectorId`, `page`, `pageSize`  
**Tables:** sources (SELECT)  
**Auth:** Required (editorial staff only — never public)

### POST /api/sources
Create a source record.

**Body:** `{ name, nameEn?, title?, organization?, phone?, email?, countryId?, sectorId?, tags?, reliabilityRating?, embargoUntil?, privateNotes? }`  
**Tables:** sources (INSERT)  
**Auth:** Required

---

## `/api/sources/[id]`

### GET /api/sources/[id]
Get source detail with linked articles.

**Tables:** sources (SELECT), source_article_links (SELECT), articles (JOIN)  
**Auth:** Required

### PUT /api/sources/[id]
Update source.

**Tables:** sources (UPDATE)  
**Auth:** Required

### DELETE /api/sources/[id]
Delete source.

**Tables:** sources (DELETE)  
**Auth:** Required

---

## `/api/sources/[id]/articles`

### GET /api/sources/[id]/articles
Articles this source was quoted in.

**Tables:** source_article_links (SELECT), articles (JOIN)  
**Auth:** Required

### POST /api/sources/[id]/articles
Link a source to an article.

**Body:** `{ articleId, quoteExcerpt? }`  
**Tables:** source_article_links (INSERT)  
**Auth:** Required
