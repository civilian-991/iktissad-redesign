const BASE_URL = 'https://www.iktissadonline.com';
const SITE_NAME = 'الإقتصاد والأعمال';
const SITE_DESCRIPTION = 'أحدث الأخبار الاقتصادية والمالية';

export interface RssArticleRow {
  slug: string | null;
  title: string | null;
  excerpt: string | null;
  published_at: string | null;
  updated_at: string | null;
  featured_image: string | null;
  tags: string[] | null;
  users: { name: string | null } | null;
  sections: { name: string | null } | null;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildItem(row: RssArticleRow): string {
  const slug = row.slug ?? '';
  const title = row.title ?? '';
  const excerpt = row.excerpt ?? '';
  const pubDate = row.published_at
    ? new Date(row.published_at).toUTCString()
    : new Date().toUTCString();
  const authorName = row.users?.name ?? '';
  const articleUrl = `${BASE_URL}/${escapeXml(slug)}`;

  const authorTag = authorName
    ? `<author>author@iktissadonline.com (${escapeXml(authorName)})</author>`
    : '';

  return `    <item>
      <title><![CDATA[${title}]]></title>
      <link>${articleUrl}</link>
      <guid isPermaLink="true">${articleUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${excerpt}]]></description>
      ${authorTag}
    </item>`;
}

export function buildRssFeed(
  rows: RssArticleRow[],
  options: {
    feedUrl: string;
    channelTitle?: string;
    channelDescription?: string;
  }
): string {
  const { feedUrl, channelTitle, channelDescription } = options;
  const title = channelTitle ?? SITE_NAME;
  const description = channelDescription ?? SITE_DESCRIPTION;
  const lastBuildDate = new Date().toUTCString();
  const items = (rows ?? []).map(buildItem).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xml:lang="ar" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(title)}</title>
    <link>${BASE_URL}</link>
    <description>${escapeXml(description)}</description>
    <language>ar</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${BASE_URL}${escapeXml(feedUrl)}" rel="self" type="application/rss+xml"/>
    <image>
      <url>${BASE_URL}/logo.png</url>
      <title>${escapeXml(title)}</title>
      <link>${BASE_URL}</link>
    </image>
${items}
  </channel>
</rss>`;
}

export const RSS_HEADERS = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, max-age=300, s-maxage=600',
} as const;
