/**
 * CSRF helpers for the browser.
 *
 * The proxy (src/proxy.ts) rejects every /api/ mutation whose x-csrf-token
 * header doesn't match the csrf-token cookie. `src/lib/api-client.ts` handles
 * that for admin calls; this is the standalone version for public-page fetches
 * that shouldn't pull in the whole api-client (retry queue, rate-limit state).
 *
 * Deliberately free of server imports (no next/headers) so client components
 * can use it. The server-side counterpart is src/lib/csrf.ts, which re-exports
 * the two constants below so both sides agree on the names.
 */

export const CSRF_COOKIE = "csrf-token";
export const CSRF_HEADER = "x-csrf-token";

let cachedToken: string | null = null;
/** In-flight mint, so concurrent callers share one /api/auth/csrf request. */
let pending: Promise<string> | null = null;

function readTokenCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${CSRF_COOKIE}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Returns a CSRF token, minting one via GET /api/auth/csrf when the cookie
 * isn't set yet (the common case for anonymous readers, who never touch a
 * mutation route until they do).
 *
 * Returns "" if a token can't be obtained. Callers should still send their
 * request in that case and let the server decide, rather than dropping it.
 */
export async function getCsrfToken(): Promise<string> {
  if (cachedToken) return cachedToken;

  const fromCookie = readTokenCookie();
  if (fromCookie) {
    cachedToken = fromCookie;
    return cachedToken;
  }

  pending ??= (async () => {
    try {
      const res = await fetch("/api/auth/csrf");
      if (res.ok) {
        const data = (await res.json()) as { csrfToken?: string };
        if (data.csrfToken) {
          cachedToken = data.csrfToken;
          return cachedToken;
        }
      }
    } catch {
      // Non-fatal — fall through and return "".
    }
    return "";
  })().finally(() => {
    pending = null;
  });

  return pending;
}

/** Headers for a JSON mutation, carrying the CSRF token when one is available. */
export async function csrfJsonHeaders(): Promise<Record<string, string>> {
  const token = await getCsrfToken();
  return token
    ? { "Content-Type": "application/json", [CSRF_HEADER]: token }
    : { "Content-Type": "application/json" };
}
