import { redirectLegacyPath } from '@/lib/redirects';

/** Legacy iktissadonline.com /persons/… URL → mapped page (see scripts/rebuild/32-build-page-redirects.mjs). */
export const dynamic = 'force-dynamic';

export default async function LegacyPersonsPath({ params }: { params: Promise<{ path: string[] }> }) {
  return redirectLegacyPath('persons', (await params).path);
}
