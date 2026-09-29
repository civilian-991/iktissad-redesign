import { redirectLegacyPath } from '@/lib/redirects';

/** Legacy iktissadonline.com /iktnode/… URL → mapped page (see scripts/rebuild/32-build-page-redirects.mjs). */
export const dynamic = 'force-dynamic';

export default async function LegacyIktnodePath({ params }: { params: Promise<{ path: string[] }> }) {
  return redirectLegacyPath('iktnode', (await params).path);
}
