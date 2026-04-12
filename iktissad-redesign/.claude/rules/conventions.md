# Codebase Conventions

## API Route Structure

Every route file in `src/app/api/**/route.ts` follows this pattern:

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";       // for GETs
import { createAdminClient } from "@/lib/supabase/admin";   // for writes
import { mapXxxRow } from "@/lib/supabase/mappers";
import type { ApiResponse, Xxx } from "@/types";

// GET — public reads use server client (RLS applies)
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("table").select("*");
  if (error) return NextResponse.json({ error: error.message } satisfies ApiResponse<never>, { status: 500 });
  return NextResponse.json({ data: data.map(mapXxxRow) } satisfies ApiResponse<Xxx[]>);
}

// POST/PUT/DELETE — writes use admin client + auth guard
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authenticated) return unauthorizedResponse();

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues.map(i => i.message).join(", ") }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from("table").insert(insertData).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: mapXxxRow(data) }, { status: 201 });
}
```

## Response Format — `ApiResponse<T>`

```ts
// Success list
{ data: T[], pagination: { page, pageSize, total, totalPages } }
// Success single
{ data: T }
// Error
{ error: string }
```

Defined in `src/types/index.ts`.

## Supabase Query Patterns

### Select with joins (relations)
```ts
const ARTICLE_SELECT = `
  *,
  users:author_id ( name, avatar ),
  sections:section_id ( slug, name ),
  sectors:sector_id ( slug, name ),
  countries:country_id ( slug, name )
`;
supabase.from("articles").select(ARTICLE_SELECT, { count: "exact" });
```

### Pagination
```ts
const start = (page - 1) * pageSize;
query.range(start, start + pageSize - 1);
```

### Slug → ID lookups in parallel (avoid sequential)
```ts
const [sectionResult, countryResult] = await Promise.all([
  slug1 ? supabase.from("sections").select("id").eq("slug", slug1).single() : Promise.resolve({ data: null }),
  slug2 ? supabase.from("countries").select("id").eq("slug", slug2).single() : Promise.resolve({ data: null }),
]);
```

### UUID vs slug detection
```ts
const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
query = isUuid ? query.eq("id", id) : query.eq("slug", id);
```

### Fire-and-forget (view counts, etc.)
```ts
void Promise.resolve(admin.from("articles").update({ views: row.views + 1 }).eq("id", id)).catch(console.error);
```

### Type casting workaround (postgrest-js v2.95.3 limitation)
```ts
// When TypeScript can't infer return type, cast the query builder
const { data } = await (admin.from("articles") as any).insert(insertData).select(SELECT).single();
// Or cast the result
const { data: row } = await query.single() as { data: any; error: any };
```

## Mappers (snake_case ↔ camelCase)

Always map DB rows before returning from API routes:
```ts
import { mapArticleRow, mapMagazineRow } from "@/lib/supabase/mappers";
const articles = (rows ?? []).map(r => mapArticleRow(r));
```

Fields always named the same way in DB: `featured_image`, `title_en`, `author_id`, `section_id`, `published_at`, `created_at`, `updated_at`.

## Partial Updates (PATCH pattern)

For PUT endpoints, build `updateData` only with fields that are explicitly provided:
```ts
const updateData: Record<string, unknown> = {};
if (data.title !== undefined) updateData.title = data.title;
if (data.titleEn !== undefined) updateData.title_en = data.titleEn;
// ... etc
```
This prevents accidentally nulling fields the caller didn't intend to change.

## Auth

```ts
import { requireAuth, unauthorizedResponse } from "@/lib/api-auth";
const auth = await requireAuth();
if (!auth.authenticated) return unauthorizedResponse();
```

In server components and admin layout, use:
```ts
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect("/login");
```

## Error Handling

- Return `{ error: error.message }` with appropriate HTTP status
- 400 = validation failure, 401 = unauthenticated, 403 = unauthorized, 404 = not found, 500 = DB/server error
- Use `satisfies ApiResponse<never>` on error returns for type safety
- Do not throw — always return NextResponse.json

## i18n

All user-facing strings go through `useTranslation()` hook from `src/lib/i18n/`. Arabic is `ar.ts`, English is `en.ts`. About 1000 leaf keys each.

## Component Architecture

- `page.tsx` = Server Component (exports `metadata` or `generateMetadata()`, fetches initial data)
- `PageClient.tsx` = Client Component (receives data as props, handles interactivity)
- All components use `useTranslation()` — no hardcoded Arabic or English strings
- `'use client'` only when the component needs state, effects, or browser APIs

## Fonts & Styling

- Fonts: Tajawal (Arabic) + Playfair Display (English headings) via `next/font`, set as CSS vars on `<html>`
- Tailwind v4: use `@theme` block in CSS, not `theme.extend` in config
- Design tokens: `src/lib/design-tokens.ts`
- All layouts are RTL (`dir="rtl"`)
