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

  // Resolve country slug to id + name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: country } = await (supabase as any)
    .from('countries')
    .select('id, name')
    .eq('slug', slug)
    .single();

  if (!country) {
    return new Response('Not Found', { status: 404 });
  }

  // Multi-country: match through article_countries so an article filed under
  // several countries appears in each of their feeds.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (supabase as any)
    .from('articles')
    .select(`${ARTICLE_SELECT}, country_filter:article_countries!inner ( country_id )`)
    .eq('status', 'published')
    .eq('country_filter.country_id', (country as { id: string; name: string }).id)
    .order('published_at', { ascending: false })
    .limit(50);

  const countryName = (country as { id: string; name: string }).name ?? slug;

  const xml = buildRssFeed((rows ?? []) as RssArticleRow[], {
    feedUrl: `/feed/countries/${slug}`,
    channelTitle: `الإقتصاد والأعمال — ${countryName}`,
    channelDescription: `أحدث الأخبار الاقتصادية من ${countryName}`,
  });

  return new Response(xml, { headers: RSS_HEADERS });
}
