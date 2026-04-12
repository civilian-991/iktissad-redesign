# Mandatory Skill Usage

Before implementing ANY feature, check this list. If a skill matches, you MUST load and follow it. Do NOT improvise your own approach when a skill exists.

## Next.js / React (ALWAYS use for this project)
- `next-best-practices` — ANY Next.js App Router code: layouts, pages, route handlers, server components, server actions, metadata, loading/error states
- `next-cache-components` — ANY caching, ISR, `use cache`, PPR, revalidation, or stale data handling
- `vercel-react-best-practices` — ANY React component: state management, performance, rendering patterns, hooks
- `vercel-composition-patterns` — Component architecture, compound components, render props, slot patterns
- `vercel-react-view-transitions` — ANY page transitions or animations between routes

## Supabase (ALWAYS use for this project)
- `supabase` — ANY Supabase task: auth, database queries, edge functions, storage, realtime, RLS policies
- `supabase-postgres-best-practices` — ANY schema changes, migrations, indexes, query optimization, RLS

## Frontend / UI (ALWAYS use when touching UI)
- `frontend-design` — ANY UI component creation or modification, layouts, responsive design, styling
- `web-design-guidelines` — ANY UI/UX decisions, accessibility, design review
- `shadcn` (vercel plugin) — ANY new UI component; check if shadcn/ui has it before building from scratch

## Deployment & Infrastructure
- `deploy-to-vercel` — ANY deployment task
- `vercel-cli-with-tokens` — Vercel CLI operations
- `vercel-functions` — Edge/serverless function patterns
- `routing-middleware` — Next.js middleware, redirects, rewrites

## Marketing (use when working on marketing features)
- `market-seo` — SEO content audits, meta tags, structured data
- `market-emails` — Email templates, newsletter content
- `market-social` — Social media content, sharing features
- `market-landing` — Landing page optimization, CRO

## Auth
- `stack-auth` — Authentication implementation, session management
- `auth` (vercel plugin) — Auth patterns and best practices

## Enforcement

When you receive ANY coding task:
1. Search knowledge-rag for relevant schema/API docs
2. Identify which skills from this list apply
3. Load and follow those skills BEFORE writing code
4. If multiple skills apply, use ALL of them

NEVER write Next.js code without loading `next-best-practices`.
NEVER write Supabase queries without loading `supabase` + `supabase-postgres-best-practices`.
NEVER create UI without loading `frontend-design` + `web-design-guidelines`.
NEVER deploy without loading `deploy-to-vercel`.
