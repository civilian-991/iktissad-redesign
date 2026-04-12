# Schema: Users Domain

Tables for CMS staff, subscriber profiles, admin roles, notifications, API keys, and audit logs.

---

## `users`

CMS admin/editorial staff (separate from Supabase Auth end-users / subscribers).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | Matches Supabase Auth UID |
| email | TEXT | UNIQUE NOT NULL | |
| name | TEXT | NOT NULL | Display name |
| role | user_role | NOT NULL DEFAULT 'author' | enum: admin, editor, author, contributor |
| avatar | TEXT | DEFAULT '' | Storage URL |
| department | TEXT | DEFAULT '' | e.g. "Editorial", "Finance" |
| status | user_status | DEFAULT 'active' | enum: active, inactive, suspended |
| article_count | INT | DEFAULT 0 | Denormalized counter |
| last_active | TIMESTAMPTZ | DEFAULT now() | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:** email, role  
**RLS:** Admin full access (service role only)

---

## `profiles`

Public-facing entity profiles (companies, government bodies, NGOs, individuals).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| name | TEXT | NOT NULL | Arabic name |
| name_en | TEXT | DEFAULT '' | |
| description | TEXT | DEFAULT '' | Arabic |
| description_en | TEXT | DEFAULT '' | |
| logo | TEXT | DEFAULT '' | Storage URL |
| sector_id | UUID | FK → sectors(id) ON DELETE SET NULL | |
| country_id | UUID | FK → countries(id) ON DELETE SET NULL | |
| website | TEXT | DEFAULT '' | |
| founded | TEXT | DEFAULT '' | Year or date string |
| type | profile_type | DEFAULT 'corporation' | enum: corporation, government, ngo, individual |
| quote | TEXT | DEFAULT '' | Featured quote |
| image | TEXT | DEFAULT '' | Hero image URL |
| category | TEXT | DEFAULT '' | Sub-category label |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Auto-updated by trigger |

**Indexes:** sector_id, country_id, type  
**RLS:** Public SELECT

---

## `admin_roles`

Maps a user to their CMS admin role and permissions. One row per admin user.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| user_id | UUID | PK FK → users(id) ON DELETE CASCADE | |
| role | admin_role | NOT NULL DEFAULT 'writer' | enum: super_admin, editor, writer, finance, advertiser_manager |
| permissions | JSONB | DEFAULT '{}' | Fine-grained permission overrides |
| invited_by | UUID | FK → users(id) | |
| two_fa_enabled | BOOLEAN | DEFAULT false | |
| last_login | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Auto-updated by trigger |

---

## `admin_notifications`

In-app notifications for CMS admin staff.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| type | notification_type | NOT NULL | enum: new_subscriber, payment_failed, subscription_canceled, comment_flagged, article_published, manual_change |
| title | TEXT | NOT NULL | |
| body | TEXT | | |
| resource_id | TEXT | | ID of the related resource |
| is_read | BOOLEAN | DEFAULT false | |
| read_by | UUID[] | DEFAULT '{}' | Array of user IDs who dismissed |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:** partial on is_read WHERE is_read = false  
**Realtime:** REPLICA IDENTITY FULL enabled for live dashboard

---

## `api_keys`

Public API keys for third-party integrations. Stores SHA-256 hash, never raw key.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| name | TEXT | NOT NULL | Human label e.g. "Mobile App" |
| key_hash | TEXT | UNIQUE NOT NULL | SHA-256 of actual key |
| key_prefix | TEXT | NOT NULL | First 8 chars shown in UI e.g. "ikt_a1b2" |
| scopes | TEXT[] | DEFAULT '{"read:articles","read:sections"}' | Permission scopes |
| rate_limit_per_minute | INT | DEFAULT 60 | |
| created_by | UUID | | User who created it |
| last_used_at | TIMESTAMPTZ | | |
| expires_at | TIMESTAMPTZ | | null = no expiry |
| is_active | BOOLEAN | DEFAULT true | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Auto-updated by trigger |

**Indexes:** key_hash, created_by  
**RLS:** service_role only

---

## `api_usage_log`

Append-only log of every API request made with an api_key.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| api_key_id | UUID | FK → api_keys(id) ON DELETE CASCADE | |
| endpoint | TEXT | NOT NULL | e.g. /api/v1/articles |
| method | TEXT | DEFAULT 'GET' | |
| status_code | INT | | HTTP response code |
| response_time_ms | INT | | |
| ip_address | TEXT | | |
| user_agent | TEXT | | |
| requested_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:** api_key_id, requested_at  
**RLS:** service_role only (written by service role)

---

## `audit_log`

Immutable trail of every admin action (create, update, delete, status change).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK | |
| actor_id | UUID | FK → users(id) ON DELETE SET NULL | Who did it |
| actor_email | TEXT | | Snapshot of email at time of action |
| action | TEXT | NOT NULL | e.g. "update_article", "delete_user" |
| resource_type | TEXT | NOT NULL | e.g. "article", "subscriber" |
| resource_id | TEXT | | UUID of affected resource |
| old_values | JSONB | | Snapshot before change |
| new_values | JSONB | | Snapshot after change |
| ip_address | TEXT | | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:** actor_id, (resource_type, resource_id), created_at DESC

---

## `totp_recovery_codes`

Single-use backup codes for admin users who lose access to their TOTP authenticator app. Codes are stored as SHA-256 hashes — never plaintext.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| user_id | UUID | NOT NULL FK → auth.users(id) ON DELETE CASCADE | Supabase Auth UID |
| code_hash | TEXT | NOT NULL | SHA-256 hash of uppercase-trimmed plaintext code |
| used_at | TIMESTAMPTZ | DEFAULT NULL | NULL = unused; set on consumption |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Indexes:** (user_id, code_hash)  
**RLS:** Users can SELECT own rows (view count only); INSERT/UPDATE via service role only  
**Code format:** 8 chars, alphanumeric, uppercase, no I/O/0/1 (confusion-free charset)  
**Count:** 10 codes generated per regeneration cycle  
**Usage:** Consumed via POST `/api/auth/2fa/recover` — marks `used_at`, does not delete  
**Regeneration:** POST `/api/auth/2fa/recovery-codes` deletes all existing rows before inserting fresh ones
