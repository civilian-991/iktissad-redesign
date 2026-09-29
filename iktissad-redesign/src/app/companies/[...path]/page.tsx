import { redirectLegacyPath } from '@/lib/redirects';

/** Legacy iktissadonline.com /companies/… URL → mapped page (see scripts/rebuild/32-build-page-redirects.mjs). */
export const dynamic = 'force-dynamic';

export default async function LegacyCompaniesPath({ params }: { params: Promise<{ path: string[] }> }) {
  return redirectLegacyPath('companies', (await params).path);
}
