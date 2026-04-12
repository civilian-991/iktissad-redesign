# CLAUDE.md — Iktissad News Platform

## STOP — READ THIS BEFORE DOING ANYTHING

**Every coding task MUST start with `mcp__knowledge-rag__search_knowledge` calls.**

Before writing ANY database query, Supabase call, API route, or component that touches data:
1. Identify which tables and endpoints are involved
2. Call `search_knowledge` for EACH one
3. Use the exact field names and patterns from the results
4. THEN write code

Do NOT use grep, find, Search, Read, or Explore on source files to look up schema or API information. The RAG index at `.rag/docs/` has pre-processed, accurate documentation for all 42 tables and 138 routes.

Only fall back to reading source files if `search_knowledge` returns no results.

**Before implementing ANY feature**, check `.claude/rules/skills.md` for matching skills. Load and follow matching skills BEFORE writing code.

---

## Project
Arabic financial news platform. Next.js 16 App Router, Supabase PostgreSQL, Tailwind CSS v4. RTL (Arabic-first). Lives in `iktissad-redesign/` subdirectory.

## Stack
- **Frontend:** Next.js 16.1.1, React 19, Tailwind v4 (uses `@theme` block, not `theme.extend`)
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Language:** TypeScript. All DB fields snake_case; frontend types camelCase — mappers in `src/lib/supabase/mappers.ts`
- **Validation:** Zod on all API routes
- **Auth:** Supabase Auth exclusively. Admin layout server component calls `auth.getUser()` and redirects to `/login` if no session.

## Database — 42 Tables, 29 Migrations

Schema docs: `.rag/docs/schema/` (7 domain files — content, magazine, users, ads, subscriptions, taxonomy, settings)

Key ENUMs: `article_status` (published/draft/review/scheduled), `admin_role` (super_admin/editor/writer/finance/advertiser_manager), `subscription_status` (trialing/active/past_due/canceled/paused/incomplete)

## API — 118 Routes

API docs: `.rag/docs/api/` (articles, admin, ai, magazines, subscriptions, taxonomy, misc)

## Three Supabase Clients — Use the Right One

| Client | File | Use when |
|--------|------|----------|
| `createClient()` | `@/lib/supabase/client` | `'use client'` components |
| `await createClient()` | `@/lib/supabase/server` | Server components, API route GETs |
| `createAdminClient()` | `@/lib/supabase/admin` | API route writes, bypass RLS |

Full docs: `.rag/docs/supabase-clients.md`

## Naming Conventions
- DB columns: `snake_case`. Frontend types: `camelCase`. API request bodies: `camelCase`.
- Arabic field: `name`, `title`, `excerpt`. English equivalent: `name_en`, `title_en`, `excerpt_en`.
- Route params: UUID or slug accepted interchangeably — routes detect with regex `/^[0-9a-f-]{36}$/i`.

## API Route Pattern
```ts
// GET — use server client (respects RLS)
const supabase = await createClient();
// POST/PUT/DELETE — use admin client (bypasses RLS)
const admin = createAdminClient();
// Auth gate on write routes
const auth = await requireAuth(); if (!auth.authenticated) return unauthorizedResponse();
// Validate body
const parsed = schema.safeParse(body); if (!parsed.success) return 400;
// Response shape
return NextResponse.json({ data: T } satisfies ApiResponse<T>);
```
