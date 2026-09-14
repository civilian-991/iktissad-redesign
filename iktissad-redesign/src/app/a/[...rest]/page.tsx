import { permanentRedirect, notFound } from 'next/navigation';
import { lookupArticleByPublicId, encodePath } from '@/lib/redirects';

/**
 * Short share link: /a/38374 → 301 → /حكم-الراجحي-يطوي-فصلاً-ثقيلاً.
 *
 * Arabic slugs percent-encode to ~330 characters on average, which is what the
 * share buttons used to hand out. This route is what they emit instead; the
 * Arabic slug stays the canonical, indexed URL and the 301 passes link equity
 * into it. Social crawlers follow the redirect and read Open Graph tags from
 * the destination, so previews are unaffected.
 *
 * Catch-all rather than a single segment so a decorative tail (/a/38374/anything,
 * the shape awalan used) resolves on the id instead of 404ing.
 *
 * Deliberately NOT under the /Article prefix: article_redirects holds 35,284
 * rows keyed on awalan's own numbering there, and a new id would eventually
 * collide with a real legacy one.
 */
export const dynamic = 'force-dynamic';

export default async function ShortArticleLink({
  params,
}: {
  params: Promise<{ rest: string[] }>;
}) {
  const { rest } = await params;

  const to = await lookupArticleByPublicId(rest[0] ?? '');
  if (to) permanentRedirect(encodePath(to));

  notFound();
}
