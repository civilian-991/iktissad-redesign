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

  // ── Google Indexing API (for news content) ─────────────────────────────────
  // TODO: Implement Google Indexing API with service account auth.
  // Requires GOOGLE_INDEXING_SA_KEY env var (service account JSON as string).
  //
  // For each URL:
  //   POST https://indexing.googleapis.com/v3/urlNotifications:publish
  //   Authorization: Bearer <oauth2_token_from_service_account>
  //   Body: { "url": "<articleUrl>", "type": "URL_UPDATED" }
  //
  // Use the `google-auth-library` package to obtain a short-lived OAuth2 token
  // from the service account JSON before making the request.
  // ──────────────────────────────────────────────────────────────────────────
}
