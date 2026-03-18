import { createClient } from '@/lib/supabase/server';
import { buildRssFeed, RSS_HEADERS, type RssArticleRow } from '@/lib/rss';

const ARTICLE_SELECT =
  'slug, title, excerpt, published_at, updated_at, featured_image, tags, users:author_id(name), sections:section_id(name)';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();

  // Resolve section slug to id + name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sec } = await (supabase as any)
    .from('sections')
    .select('id, name')
    .eq('slug', slug)
    .single();

  if (!sec) {
    return new Response('Not Found', { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (supabase as any)
    .from('articles')
    .select(ARTICLE_SELECT)
    .eq('status', 'published')
    .eq('section_id', (sec as { id: string; name: string }).id)
    .order('published_at', { ascending: false })
    .limit(50);

  const sectionName = (sec as { id: string; name: string }).name ?? slug;

  const xml = buildRssFeed((rows ?? []) as RssArticleRow[], {
    feedUrl: `/feed/sections/${slug}`,
    channelTitle: `الإقتصاد والأعمال — ${sectionName}`,
    channelDescription: `أحدث أخبار قسم ${sectionName}`,
  });

  return new Response(xml, { headers: RSS_HEADERS });
}
