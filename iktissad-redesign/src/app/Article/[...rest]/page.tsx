import { permanentRedirect, notFound } from 'next/navigation';
import { lookupAwalanArticle, lookupRedirect, encodePath } from '@/lib/redirects';

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
  const byPath = await lookupRedirect('/Article/' + rest.map((s) => decodeURIComponent(s)).join('/'));
  if (byPath) permanentRedirect(encodePath(byPath));
  notFound();
}
