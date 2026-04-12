import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

/**
 * On-demand ISR revalidation endpoint.
 * Called internally after article publish/update to bust the cached page.
 *
 * Usage:
 *   POST /api/revalidate?secret=<REVALIDATE_SECRET>
 *   Body: { slug: string, type?: "article" | "section" | "listing" }
 *
 * Set REVALIDATE_SECRET in env vars. Must be at least 16 chars.
 */
export async function POST(request: NextRequest) {
  const secret =
    request.nextUrl.searchParams.get('secret') ??
    request.headers.get('x-revalidate-secret');

  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Invalid or missing secret' }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // body is optional — slug can also come from query param
  }

  const slug =
    (body.slug as string | undefined) ??
    request.nextUrl.searchParams.get('slug') ??
    undefined;

  const type = (body.type as string | undefined) ?? 'article';

  const revalidated: string[] = [];

  if (slug) {
    // Revalidate the specific article page
    revalidatePath(`/${slug}`);
    revalidated.push(`/${slug}`);
  }

  if (type === 'article') {
    // Revalidate listing pages that show article headlines
    revalidatePath('/');
    revalidatePath('/articles');
    revalidated.push('/', '/articles');
  }

  if (type === 'section' && slug) {
    revalidatePath(`/sections/${slug}`);
    revalidated.push(`/sections/${slug}`);
  }

  return NextResponse.json({ revalidated, now: Date.now() });
}
