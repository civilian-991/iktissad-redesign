/**
 * Admin New Article Page
 *
 * Server component: creates an empty draft row, then redirects to the
 * shared editor at /admin/articles/[id]. Single editor surface, no
 * "save creates the article" client branch, and features that need an
 * articleId (Yjs collab, presence, version history, AI panels) work
 * from keystroke one.
 *
 * Empty drafts sit invisibly until the user types a title — the listing
 * filters out rows where status='draft' AND title=''. No cleanup cron.
 */
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Canonical "house byline" author — the default for every new article unless
// the editor picks a real author from the dropdown. This is the merged
// 'الإقتصاد والأعمال' record (see migration consolidating the per-city/agency
// awalan placeholder bylines into one record).
const DEFAULT_AUTHOR_ID = 'f77603cc-e466-49ca-afbf-e1c8fa90c1d9';

export default async function NewArticlePage() {
  // Auth check — admin layout already redirects to /login if no session,
  // but server actions/components shouldn't trust ancestor checks alone.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = createAdminClient();

  // Slug must be UNIQUE NOT NULL. Use a draft-scoped slug derived from a
  // random UUID; the editor will overwrite it once the user picks a title.
  const draftSlug = `draft-${crypto.randomUUID()}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error } = await (admin.from('articles') as any)
    .insert({
      title: '',
      slug: draftSlug,
      status: 'draft',
      author_id: DEFAULT_AUTHOR_ID,
    })
    .select('id')
    .single();

  if (error || !row?.id) {
    // Surface the failure rather than redirecting into a dead state.
    throw new Error(`Failed to create draft article: ${error?.message ?? 'no id returned'}`);
  }

  redirect(`/admin/articles/${row.id}`);
}
