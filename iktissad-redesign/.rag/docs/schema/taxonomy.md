# Schema: Taxonomy Domain

Tables for content classification: sections, sectors, countries, sources, and series.

---

## `sections`

News categories (e.g., economy, technology, investment, real-estate).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| slug | TEXT | UNIQUE NOT NULL | URL identifier |
| name | TEXT | NOT NULL | Arabic name |
| name_en | TEXT | NOT NULL DEFAULT '' | English name |
| description | TEXT | NOT NULL DEFAULT '' | Arabic description |
| description_en | TEXT | NOT NULL DEFAULT '' | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Auto-updated |

**Indexes:** slug  
**RLS:** Public SELECT

---

## `sectors`

Industry sectors (e.g., oil-gas, banking, energy, retail).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| slug | TEXT | UNIQUE NOT NULL | |
| name | TEXT | NOT NULL | Arabic name |
| name_en | TEXT | NOT NULL DEFAULT '' | |
| description | TEXT | NOT NULL DEFAULT '' | |
| description_en | TEXT | NOT NULL DEFAULT '' | |
| icon | TEXT | NOT NULL DEFAULT '' | Lucide icon name |
| color | TEXT | NOT NULL DEFAULT '' | Hex or Tailwind class |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Auto-updated |

**Indexes:** slug  
**RLS:** Public SELECT

---

## `countries`

Countries with economic overview and key indicators.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| slug | TEXT | UNIQUE NOT NULL | |
| name | TEXT | NOT NULL | Arabic name |
| name_en | TEXT | NOT NULL DEFAULT '' | |
| flag | TEXT | NOT NULL DEFAULT '' | Emoji flag e.g. 🇸🇦 |
| economic_overview | TEXT | NOT NULL DEFAULT '' | Arabic |
| economic_overview_en | TEXT | NOT NULL DEFAULT '' | |
| key_indicators | JSONB | NOT NULL DEFAULT '{}' | { gdp, gdpGrowth, inflation, ... } |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | Auto-updated |

**Indexes:** slug  
**RLS:** Public SELECT

---

## `sources`

Journalist source CRM — contacts, experts, and spokespersons.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| name | TEXT | NOT NULL | Arabic name |
| name_en | TEXT | | |
| title | TEXT | | Job title (Arabic) |
| title_en | TEXT | | |
| organization | TEXT | | Organization name (Arabic) |
| organization_en | TEXT | | |
| phone | TEXT | | |
| email | TEXT | | |
| country_id | UUID | FK → countries(id) | |
| sector_id | UUID | FK → sectors(id) | |
| tags | TEXT[] | DEFAULT '{}' | |
| reliability_rating | INT | CHECK BETWEEN 1 AND 5 | 1=low, 5=high |
| embargo_until | TIMESTAMPTZ | | Do not publish before this date |
| private_notes | TEXT | | Internal notes (never shown publicly) |
| created_by | UUID | | references users loosely |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Auto-updated |

**Indexes:** created_by, country_id, sector_id

---

## `source_article_links`

Junction: links a source to articles they were quoted in.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| source_id | UUID | FK → sources(id) ON DELETE CASCADE | |
| article_id | UUID | FK → articles(id) ON DELETE CASCADE | |
| quote_excerpt | TEXT | | Actual quote used |
| linked_at | TIMESTAMPTZ | DEFAULT now() | |

**Unique:** (source_id, article_id)  
**Indexes:** article_id, source_id

---

## `article_series` / `series_articles`

See `content.md` — these belong to the taxonomy domain conceptually but are documented there alongside articles.
