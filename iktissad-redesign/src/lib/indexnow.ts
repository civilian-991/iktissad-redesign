const INDEXNOW_API = 'https://api.indexnow.org/indexnow';
const BASE_URL = 'https://www.iktissadonline.com';

export async function notifyIndexNow(slugs: string[]): Promise<void> {
  const key = process.env.INDEXNOW_KEY;
  if (!key || slugs.length === 0) return; // silently skip if not configured

  const urls = slugs.map((slug) => `${BASE_URL}/${slug}`);

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
    // Non-critical — don't throw
  }
}
