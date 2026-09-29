import { redirectLegacyPath } from '@/lib/redirects';

/** Legacy iktissadonline.com /blogs/… URL → mapped page (see scripts/rebuild/32-build-page-redirects.mjs). */
export const dynamic = 'force-dynamic';

export default async function LegacyBlogsPath({ params }: { params: Promise<{ path: string[] }> }) {
  return redirectLegacyPath('blogs', (await params).path);
}
