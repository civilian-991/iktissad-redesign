import { redirectLegacyPath } from '@/lib/redirects';

/** Legacy iktissadonline.com /issues/… URL → mapped page (see scripts/rebuild/32-build-page-redirects.mjs). */
export const dynamic = 'force-dynamic';

export default async function LegacyIssuesPath({ params }: { params: Promise<{ path: string[] }> }) {
  return redirectLegacyPath('issues', (await params).path);
}
