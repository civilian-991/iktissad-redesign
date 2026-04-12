# API: Magazines

All routes under `/api/magazines/`. Reads are public (published issues); writes require auth.

---

## `/api/magazines`

### GET /api/magazines
List magazine issues with optional filtering.

**Query params:** `status`, `featured`, `page`, `pageSize`  
**Tables:** magazine_issues (SELECT)  
**Auth:** None (RLS filters to published for anon)  
**Returns:** `ApiResponse<MagazineIssue[]>` with pagination

### POST /api/magazines
Create a new magazine issue.

**Body:** `{ issueNumber, title, titleEn?, subtitle?, coverImage?, publishDate, pdfUrl?, pages?, featured?, status?, highlights? }`  
**Tables:** magazine_issues (INSERT)  
**Auth:** Required  
**Returns:** `ApiResponse<MagazineIssue>` 201

---

## `/api/magazines/[id]`

### GET /api/magazines/[id]
Get single magazine issue by UUID or issue_number.

**Tables:** magazine_issues (SELECT)  
**Auth:** None

### PUT /api/magazines/[id]
Update magazine issue.

**Tables:** magazine_issues (UPDATE)  
**Auth:** Required

### DELETE /api/magazines/[id]
Delete magazine issue (cascades to sections, spreads, articles junction).

**Tables:** magazine_issues (DELETE)  
**Auth:** Required

---

## `/api/magazines/[id]/articles`

### GET /api/magazines/[id]/articles
List articles in this issue, ordered by sort_order.

**Tables:** magazine_articles (SELECT), articles (JOIN)  
**Auth:** None

### POST /api/magazines/[id]/articles
Add an article to the issue.

**Body:** `{ articleId, sortOrder? }`  
**Tables:** magazine_articles (INSERT)  
**Auth:** Required

---

## `/api/magazines/[id]/sections`

### GET /api/magazines/[id]/sections
List sections for this issue.

**Tables:** magazine_sections (SELECT)  
**Auth:** None

### POST /api/magazines/[id]/sections
Create a section in this issue.

**Body:** `{ slug, name, nameEn?, sortOrder?, themeColor?, coverImage? }`  
**Tables:** magazine_sections (INSERT)  
**Auth:** Required

---

## `/api/magazines/[id]/sections/[sectionId]`

### PUT /api/magazines/[id]/sections/[sectionId]
Update section properties.

**Tables:** magazine_sections (UPDATE)  
**Auth:** Required

### DELETE /api/magazines/[id]/sections/[sectionId]
Delete section (spreads in this section get section_id set to NULL).

**Tables:** magazine_sections (DELETE)  
**Auth:** Required

---

## `/api/magazines/[id]/spreads`

### GET /api/magazines/[id]/spreads
List all spreads (pages) for this issue, ordered by page_number.

**Tables:** magazine_spreads (SELECT)  
**Auth:** None (published issues)

### POST /api/magazines/[id]/spreads
Create a new spread/page.

**Body:** `{ pageNumber, templateId, sectionId?, zones?, metadata? }`  
**Tables:** magazine_spreads (INSERT)  
**Auth:** Required

---

## `/api/magazines/[id]/spreads/[spreadId]`

### GET /api/magazines/[id]/spreads/[spreadId]
Get spread with full zone content.

**Tables:** magazine_spreads (SELECT)

### PUT /api/magazines/[id]/spreads/[spreadId]
Update spread zones or metadata (auto-creates revision snapshot).

**Body:** `{ zones?, metadata?, sectionId?, templateId? }`  
**Tables:** magazine_spreads (UPDATE), spread_revisions (INSERT snapshot)  
**Auth:** Required

### DELETE /api/magazines/[id]/spreads/[spreadId]
Delete spread.

**Tables:** magazine_spreads (DELETE)  
**Auth:** Required

---

## `/api/magazines/[id]/spreads/[spreadId]/revisions`

### GET /api/magazines/[id]/spreads/[spreadId]/revisions
List revision history for a spread.

**Tables:** spread_revisions (SELECT)  
**Auth:** Required

---

## `/api/magazines/[id]/pdf-url`

### GET /api/magazines/[id]/pdf-url
Get a signed URL for the issue PDF (for download/viewing).

**Tables:** magazine_issues (SELECT)  
**Auth:** Required (subscriber or admin)

---

## `/api/magazines/[id]/reader`

### GET /api/magazines/[id]/reader
Get full reader data: spreads, sections, ads for this issue.

**Tables:** magazine_spreads (SELECT), magazine_sections (SELECT), ads (SELECT)  
**Auth:** Required (subscriber or admin)
