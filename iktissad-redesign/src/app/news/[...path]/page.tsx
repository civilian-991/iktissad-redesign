import { permanentRedirect, redirect } from 'next/navigation';
import { lookupRedirect, encodePath, legacyFallback } from '@/lib/redirects';

/**
 * iktissadonline.com served every article at /news/YYYY/MM/DD/<alias>.
 * The alias is NOT our slug — Drupal slugified the article's <br> tags, so most
 * aliases contain a literal "-br-". This resolves them through the stored
 * redirect map instead of guessing.
 */
export const dynamic = 'force-dynamic';

export default async function LegacyNewsPath({
  params,
  searchParams,
}: {
  params: Promise<{ path: string[] }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { path } = await params;
  // /news/group?filter=countries|sectors — the old "browse by" index pages.
  if (path.length === 1 && path[0] === 'group') {
    const { filter } = await searchParams;
    permanentRedirect(filter === 'sectors' ? '/industries' : '/countries');
  }
  const from = '/news/' + path.map((s) => { try { return decodeURIComponent(s); } catch { return s; } }).join('/');
  const to = await lookupRedirect(from);
  if (to) permanentRedirect(encodePath(to));
  redirect(legacyFallback(from));
}
