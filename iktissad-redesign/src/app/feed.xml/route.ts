import { createClient } from '@/lib/supabase/server';
import { buildRssFeed, RSS_HEADERS, type RssArticleRow } from '@/lib/rss';

const ARTICLE_SELECT =
  'slug, title, excerpt, published_at, updated_at, featured_image, tags, users:author_id(name), sections:section_id(name)';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (supabase as any)
    .from('articles')
    .select(ARTICLE_SELECT)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50);

  const xml = buildRssFeed((rows ?? []) as RssArticleRow[], {
    feedUrl: '/feed.xml',
  });

  return new Response(xml, { headers: RSS_HEADERS });
}
