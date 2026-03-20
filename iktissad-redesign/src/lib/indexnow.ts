// Required env var: INDEXNOW_KEY
// The key value must match the string served by GET /api/indexnow/key.
// Obtain or generate a key at https://www.indexnow.org/documentation
// and set it in your .env.local and production environment variables.

const INDEXNOW_API = 'https://api.indexnow.org/indexnow';
const BASE_URL = 'https://www.iktissadonline.com';

export async function notifyIndexNow(slugs: string[]): Promise<void> {
  const key = process.env.INDEXNOW_KEY;
  if (!key || slugs.length === 0) return; // silently skip if not configured

  const urls = slugs.map((slug) => `${BASE_URL}/${slug}`);

  // IndexNow ping — non-blocking, errors must not fail the calling request
  try {
    await fetch(INDEXNOW_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: 'www.iktissadonline.com',
        key,
        keyLocation: `${BASE_URL}/api/indexnow/key`,
        urlList: urls,
      }),
    });
  } catch {
    // Non-blocking — log but don't throw
    console.error('[IndexNow] ping failed for slugs:', slugs);
  }

  // Note: Google Indexing API is NOT applicable here — it only supports
  // JobPosting and BroadcastEvent/VideoObject content types, not news articles.
  // News indexing speed is covered by: IndexNow (above), the news sitemap,
  // the RSS feed, and NewsArticle JSON-LD structured data on each article page.
}
