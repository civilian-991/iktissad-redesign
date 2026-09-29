import { redirectLegacyPath } from '@/lib/redirects';

/** Legacy iktissadonline.com /taxonomy/… URL → mapped page (see scripts/rebuild/32-build-page-redirects.mjs). */
export const dynamic = 'force-dynamic';

export default async function LegacyTaxonomyPath({ params }: { params: Promise<{ path: string[] }> }) {
  return redirectLegacyPath('taxonomy', (await params).path);
}
