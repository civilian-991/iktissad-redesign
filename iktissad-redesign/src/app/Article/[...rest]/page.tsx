import { permanentRedirect, redirect } from 'next/navigation';
import { lookupAwalanArticle, lookupRedirect, encodePath, legacyFallback } from '@/lib/redirects';

/**
 * awalan.com served every article at /Article/<id>/<slug>.
 * Match on the id: the trailing slug segment is decorative and was frequently
 * rewritten, so it cannot be relied on. There was previously no route here at
 * all, which is why every awalan URL 404'd.
 */
export const dynamic = 'force-dynamic';

export default async function LegacyAwalanArticle({
  params,
}: {
  params: Promise<{ rest: string[] }>;
}) {
  const { rest } = await params;
  const id = rest[0];

  if (/^\d+$/.test(id)) {
    const byId = await lookupAwalanArticle(id);
    if (byId) permanentRedirect(encodePath(byId));
  }
  const from = '/Article/' + rest.map((s) => { try { return decodeURIComponent(s); } catch { return s; } }).join('/');
  const byPath = await lookupRedirect(from);
  if (byPath) permanentRedirect(encodePath(byPath));
  // /Article/<id> alone has no words to search for.
  redirect(rest.length > 1 ? legacyFallback(from) : '/');
}
