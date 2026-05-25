/**
 * Admin New Article Page
 *
 * Server component: creates a draft row, then redirects to the shared editor
 * at /admin/articles/[id]. Single editor surface, no "save creates the
 * article" client branch, and features that need an articleId (Yjs collab,
 * presence, version history, AI panels) work from keystroke one.
 *
 * Prefill: the AI Content Agent links here with `?draft=<json>` (a full draft)
 * and the Article Brief Generator with `?brief=<json>` (an outline). We seed
 * those into the row server-side so the editor opens already populated. The
 * AI body (lightly-marked-down text) is converted to TipTap JSON for `body`.
 *
 * Empty drafts sit invisibly until the user types a title — the listing
 * filters out rows where status='draft' AND title=''. No cleanup cron.
 */
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseDraftParam, parseBriefParam } from '@/lib/ai/draft-prefill';

// Canonical "house byline" author — the default for every new article unless
// the editor picks a real author from the dropdown. This is the merged
// 'الإقتصاد والأعمال' record (see migration consolidating the per-city/agency
// awalan placeholder bylines into one record).
const DEFAULT_AUTHOR_ID = 'f77603cc-e466-49ca-afbf-e1c8fa90c1d9';

export default async function NewArticlePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Auth check — admin layout already redirects to /login if no session,
  // but server actions/components shouldn't trust ancestor checks alone.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Resolve optional prefill from the AI agent (?draft=) or brief generator
  // (?brief=). Either is best-effort — malformed payloads yield null and we
  // fall back to a blank draft.
  const sp = searchParams ? await searchParams : {};
  const draftRaw = typeof sp.draft === 'string' ? sp.draft : undefined;
  const briefRaw = typeof sp.brief === 'string' ? sp.brief : undefined;
  const prefill = parseDraftParam(draftRaw) ?? parseBriefParam(briefRaw);

  const admin = createAdminClient();

  // Slug must be UNIQUE NOT NULL. Use a draft-scoped slug derived from a
  // random UUID; the editor will overwrite it once the user picks a title.
  const draftSlug = `draft-${crypto.randomUUID()}`;

  const insertData: Record<string, unknown> = {
    title: prefill?.title ?? '',
    slug: draftSlug,
    status: 'draft',
    author_id: DEFAULT_AUTHOR_ID,
  };
  if (prefill?.excerpt !== undefined) insertData.excerpt = prefill.excerpt;
  if (prefill?.tags?.length) insertData.tags = prefill.tags;
  if (prefill?.articleType) insertData.article_type = prefill.articleType;
  if (prefill?.metaDescription !== undefined) insertData.meta_description = prefill.metaDescription;
  if (prefill?.body) {
    // body (jsonb) is the canonical TipTap doc; content mirrors it as a JSON
    // string, matching how the editor saves (see ArticleEditor buildSavePayload).
    insertData.body = prefill.body;
    insertData.content = JSON.stringify(prefill.body);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from('articles') as any)
    .insert(insertData)
    .select('id')
    .single();

  if (error || !row?.id) {
    // Surface the failure rather than redirecting into a dead state.
    throw new Error(`Failed to create draft article: ${error?.message ?? 'no id returned'}`);
  }

  redirect(`/admin/articles/${row.id}`);
}
