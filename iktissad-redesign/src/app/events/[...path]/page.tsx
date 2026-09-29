import { redirectLegacyPath } from '@/lib/redirects';

/** Legacy iktissadonline.com /events/… URL → mapped page (see scripts/rebuild/32-build-page-redirects.mjs). */
export const dynamic = 'force-dynamic';

export default async function LegacyEventsPath({ params }: { params: Promise<{ path: string[] }> }) {
  return redirectLegacyPath('events', (await params).path);
}
