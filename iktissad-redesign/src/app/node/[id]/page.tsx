import { permanentRedirect, notFound } from 'next/navigation';
import { lookupRedirect, encodePath } from '@/lib/redirects';

/**
 * Drupal serves every node at its unaliased path /node/<nid> as well as at its
 * alias, and both forms appear in the wild — in old emails, in CMS exports and
 * wherever an alias was never generated. 8,886 of them are in the redirect map.
 */
export const dynamic = 'force-dynamic';

export default async function LegacyNodePath({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  const to = await lookupRedirect(`/node/${id}`);
  if (to) permanentRedirect(encodePath(to));
  notFound();
}
