import { permanentRedirect, notFound } from 'next/navigation';
import { lookupRedirect, encodePath } from '@/lib/redirects';

/**
 * iktissadonline.com served every article at /news/YYYY/MM/DD/<alias>.
 * The alias is NOT our slug — Drupal slugified the article's <br> tags, so most
 * aliases contain a literal "-br-". This resolves them through the stored
 * redirect map instead of guessing.
 */
export const dynamic = 'force-dynamic';

export default async function LegacyNewsPath({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  const to = await lookupRedirect('/news/' + path.map((s) => decodeURIComponent(s)).join('/'));
  if (to) permanentRedirect(encodePath(to));
  notFound();
}
