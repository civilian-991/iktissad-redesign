# Schema: Magazine Domain

Tables for the digital magazine product: issues, sections, spreads, and templates.

---

## `magazine_issues`

One row per magazine issue.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| issue_number | INT | UNIQUE NOT NULL | Sequential issue number |
| title | TEXT | NOT NULL | Arabic title |
| title_en | TEXT | DEFAULT '' | |
| subtitle | TEXT | DEFAULT '' | |
| cover_image | TEXT | DEFAULT '' | Storage URL |
| publish_date | TIMESTAMPTZ | NOT NULL | |
| pdf_url | TEXT | DEFAULT '' | Full-issue PDF URL |
| pages | INT | DEFAULT 0 | Page count |
| views | INT | DEFAULT 0 | |
| downloads | INT | DEFAULT 0 | |
| featured | BOOLEAN | DEFAULT false | |
| status | magazine_status | DEFAULT 'draft' | enum: published, draft, scheduled |
| highlights | TEXT[] | DEFAULT '{}' | Key highlight strings |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Auto-updated by trigger |

**Indexes:** issue_number DESC, status

---

## `magazine_articles`

Junction: which articles appear in which issue, with sort order.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| magazine_id | UUID | NOT NULL FK → magazine_issues(id) ON DELETE CASCADE | |
| article_id | UUID | NOT NULL FK → articles(id) ON DELETE CASCADE | |
| sort_order | INT | DEFAULT 0 | |

**Primary Key:** (magazine_id, article_id)

---

## `magazine_sections`

Named sections within an issue (e.g., "Economy", "Markets").

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| issue_id | UUID | FK → magazine_issues(id) ON DELETE CASCADE | |
| slug | TEXT | NOT NULL | |
| name | TEXT | NOT NULL | Arabic name |
| name_en | TEXT | DEFAULT '' | |
| sort_order | INT | DEFAULT 0 | |
| theme_color | TEXT | DEFAULT '#DDA853' | Hex color |
| cover_image | TEXT | DEFAULT '' | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

---

## `magazine_spreads`

Page spreads within an issue — actual content assignments using a template.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| issue_id | UUID | FK → magazine_issues(id) ON DELETE CASCADE | |
| section_id | UUID | FK → magazine_sections(id) ON DELETE SET NULL | |
| page_number | INT | NOT NULL | |
| template_id | TEXT | NOT NULL | Slug of the spread template used |
| zones | JSONB | DEFAULT '{}' | Content zone assignments (text, images, ads) |
| metadata | JSONB | DEFAULT '{}' | Extra layout metadata |
| updated_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_by | UUID | FK → users(id) | |

**Unique:** (issue_id, page_number)

---

## `magazine_spread_reads`

Analytics: tracks each spread view session.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| issue_id | UUID | NOT NULL FK → magazine_issues(id) ON DELETE CASCADE | |
| subscriber_id | UUID | FK → subscribers(id) ON DELETE SET NULL | null for anonymous |
| session_id | TEXT | NOT NULL | |
| spread_number | INT | NOT NULL | |
| dwell_seconds | INT | DEFAULT 0 | Time on spread |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

---

## `spread_revisions`

Version history for a spread — each save creates a snapshot.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| spread_id | UUID | FK → magazine_spreads(id) ON DELETE CASCADE | |
| snapshot | JSONB | NOT NULL | Full spread zones+metadata at time of save |
| saved_at | TIMESTAMPTZ | DEFAULT now() | |
| saved_by | UUID | FK → users(id) | |
| label | TEXT | | Optional human label (e.g. "Before redesign") |

---

## `spread_templates`

Admin-defined reusable layout templates for spreads.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| slug | TEXT | UNIQUE NOT NULL | Template identifier |
| name | TEXT | NOT NULL | English name |
| name_ar | TEXT | NOT NULL | Arabic name |
| thumbnail_svg | TEXT | | SVG preview |
| zones | JSONB | DEFAULT '[]' | Zone definitions (position, size, type) |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
