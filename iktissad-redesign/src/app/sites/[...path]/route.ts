import { NextRequest, NextResponse } from 'next/server';
import { lookupRedirect } from '@/lib/redirects';

/**
 * Legacy iktissadonline.com uploads: /sites/default/files/<path>.
 *
 * Mapped files (scripts/rebuild/35-build-file-redirects.mjs) 301 to our copy in
 * storage. Drupal image-style derivatives
 * (/sites/default/files/styles/<style>/public/<path>) resolve to the original.
 * Anything else was never used by a published article and has no copy; it goes
 * to the homepage rather than a 404.
 */
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const segments = (await params).path.map((s) => {
    try { return decodeURIComponent(s); } catch { return s; }
  });
  const path = ('/sites/' + segments.join('/'))
    .replace(/^\/sites\/default\/files\/styles\/[^/]+\/public\//, '/sites/default/files/');

  const to = await lookupRedirect(path);
  if (to) {
    // Storage URLs are stored decoded; URL() percent-encodes the path.
    const target = /^https?:\/\//.test(to) ? new URL(to) : new URL(to, request.url);
    return NextResponse.redirect(target, 301);
  }
  return NextResponse.redirect(new URL('/', request.url), 302);
}
