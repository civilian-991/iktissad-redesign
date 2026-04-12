# Supabase Client Variants

There are three Supabase client factories in `src/lib/supabase/`. **Never mix them up.**

---

## 1. Browser Client — `client.ts`

```ts
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
```

**File:** `src/lib/supabase/client.ts`  
**Package:** `@supabase/ssr` → `createBrowserClient`  
**Key:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
**Session:** Reads from browser cookies automatically  
**RLS:** Enforced (anon key, respects policies)

**Use when:**
- Inside `'use client'` components
- Client-side data fetching in React components
- Auth state listeners (`supabase.auth.onAuthStateChange`)

**Do NOT use for:**
- Server components, API routes, server actions
- Admin operations (bypassing RLS)

---

## 2. Server Client — `server.ts`

```ts
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();  // NOTE: async — must await
```

**File:** `src/lib/supabase/server.ts`  
**Package:** `@supabase/ssr` → `createServerClient`  
**Key:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
**Session:** Reads from Next.js `cookies()` store (SSR cookie-based auth)  
**RLS:** Enforced (anon key, respects policies)

**Use when:**
- Server Components
- API route handlers (`GET`, `POST`, etc. in `route.ts`)
- Server Actions
- Reading user-specific data that should respect RLS

**Dev feature:** In development only, wraps the client with a query-timing Proxy that logs `[SLOW QUERY] Xms: table.operation` for any query taking >100ms. Zero overhead in production.

**Important:** The `createClient()` function is async (uses `await cookies()`). Always `await` it.

---

## 3. Admin Client — `admin.ts`

```ts
import { createAdminClient } from "@/lib/supabase/admin";
const admin = createAdminClient();  // synchronous
```

**File:** `src/lib/supabase/admin.ts`  
**Package:** `@supabase/supabase-js` → `createClient`  
**Key:** `SUPABASE_SERVICE_ROLE_KEY` (server-only env var, never public)  
**Session:** None (service role, stateless)  
**RLS:** **BYPASSED** — service role ignores all RLS policies

**Use when:**
- Writing data that must bypass RLS (article creation, user provisioning)
- Admin CRUD operations in API routes
- Seeding, migrations, background jobs
- Incrementing counters (fire-and-forget, e.g., `views`)
- Provisioning Supabase Auth users

**NEVER use:**
- In client components (would expose service role key)
- For public read operations (use server client instead — RLS protects data)

**Auth config:** `autoRefreshToken: false`, `persistSession: false` — appropriate for stateless server use.

---

## Choosing the Right Client

| Scenario | Client |
|----------|--------|
| `'use client'` component fetching user data | `client.ts` |
| Server Component reading public published articles | `server.ts` |
| API route GET (public data) | `server.ts` |
| API route POST/PUT/DELETE (admin writes) | `admin.ts` |
| Checking auth session in server component | `server.ts` |
| Sending admin notification / audit log | `admin.ts` |
| Incrementing view count (fire-and-forget) | `admin.ts` |

---

## Barrel Export

`src/lib/supabase/index.ts` re-exports all three — but prefer direct imports for clarity:

```ts
// Preferred — explicit about which client you're getting
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
```

---

## Environment Variables

| Variable | Client | Required on |
|----------|--------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | All | Both client + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | Both |
| `SUPABASE_SERVICE_ROLE_KEY` | admin only | Server only — NEVER prefix NEXT_PUBLIC_ |

---

## Other Files

- **`types.ts`** — `Database` TypeScript type generated from schema. Used as generic parameter on all clients.
- **`mappers.ts`** — `mapArticleRow()`, `mapMagazineRow()`, etc. Convert DB snake_case rows to camelCase frontend types. Always run query results through mappers before returning from API routes.
- **`storage.ts`** — Helpers for Supabase Storage: upload, getPublicUrl, delete. Buckets: `articles`, `magazines`, `media`, `avatars`.
