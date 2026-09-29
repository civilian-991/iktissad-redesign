/**
 * CSRF helpers for the browser.
 *
 * The proxy (src/proxy.ts) rejects every /api/ mutation whose x-csrf-token
 * header doesn't match the csrf-token cookie. `src/lib/api-client.ts` routes
 * every admin mutation through here; public-page fetches can call it directly.
 *
 * The cookie — not this module's memory — is the source of truth, because it
 * is what the proxy compares against. It expires (24h) and any other tab can
 * rotate it, so a token held in memory goes stale while the page stays open.
 * Read the cookie on every call and only mint when it's actually gone.
 *
 * Deliberately free of server imports (no next/headers) so client components
 * can use it. The server-side counterpart is src/lib/csrf.ts, which re-exports
 * the two constants below so both sides agree on the names.
 */

export const CSRF_COOKIE = "csrf-token";
export const CSRF_HEADER = "x-csrf-token";

/** Last minted token. Only a fallback for when the cookie can't be read. */
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
 * mutation route until they do — and for any page open long enough for the
 * cookie to expire underneath it).
 *
 * Returns "" if a token can't be obtained. Callers should still send their
 * request in that case and let the server decide, rather than dropping it.
 */
export async function getCsrfToken(): Promise<string> {
  const fromCookie = readTokenCookie();
  if (fromCookie) {
    cachedToken = fromCookie;
    return cachedToken;
  }

  pending ??= (async () => {
    try {
      const res = await fetch("/api/auth/csrf", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { csrfToken?: string };
        if (data.csrfToken) {
          cachedToken = data.csrfToken;
          return cachedToken;
        }
      }
    } catch {
      // Non-fatal — fall through and return the last token we held, if any.
    }
    return cachedToken ?? "";
  })().finally(() => {
    pending = null;
  });

  return pending;
}

/**
 * Drop the remembered token so the next getCsrfToken() re-reads the cookie or
 * mints a fresh one. Call it after a request comes back 403 Invalid CSRF token.
 */
export function invalidateCsrfToken(): void {
  cachedToken = null;
}

/** Headers for a JSON mutation, carrying the CSRF token when one is available. */
export async function csrfJsonHeaders(): Promise<Record<string, string>> {
  const token = await getCsrfToken();
  return token
    ? { "Content-Type": "application/json", [CSRF_HEADER]: token }
    : { "Content-Type": "application/json" };
}
