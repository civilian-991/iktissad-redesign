/**
 * In-memory sliding window rate limiter.
 *
 * Stores per-key timestamp arrays in a module-level Map. Works correctly
 * within a single Node.js process (Vercel Fluid Compute instance reuse).
 * For multi-instance production use, swap the store for Redis/Upstash.
 *
 * Usage:
 *   const result = rateLimit(`ip:${ip}`, { limit: 60, windowMs: 60_000 });
 *   if (!result.allowed) {
 *     return NextResponse.json({ error: "Too Many Requests" }, {
 *       status: 429,
 *       headers: result.headers,
 *     });
 *   }
 *   // Add result.headers to success responses too
 */

interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Unix epoch ms when the oldest request in the window expires */
  resetAt: number;
  /** Ready-to-spread response headers */
  headers: Record<string, string>;
}

// Sliding window store: key → sorted array of request timestamps (ms)
const store = new Map<string, number[]>();

// Periodically purge stale keys to prevent unbounded memory growth.
// Runs every 5 minutes; removes keys whose entire window has expired.
let cleanupScheduled = false;
function scheduleCleanup(): void {
  if (cleanupScheduled) return;
  cleanupScheduled = true;
  setTimeout(() => {
    const now = Date.now();
    for (const [key, timestamps] of store.entries()) {
      // If no timestamps remain within any reasonable window, drop the key
      if (timestamps.length === 0 || now - timestamps[0] > 10 * 60_000) {
        store.delete(key);
      }
    }
    cleanupScheduled = false;
    scheduleCleanup(); // reschedule
  }, 5 * 60_000);
}

export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  scheduleCleanup();

  const { limit, windowMs } = opts;
  const now = Date.now();
  const windowStart = now - windowMs;

  // Get existing timestamps for this key, pruned to the current window
  let timestamps = (store.get(key) ?? []).filter((t) => t > windowStart);

  const allowed = timestamps.length < limit;
  if (allowed) {
    timestamps = [...timestamps, now];
  }
  store.set(key, timestamps);

  const resetAt =
    timestamps.length > 0
      ? timestamps[0] + windowMs  // when the oldest request drops out
      : now + windowMs;

  const remaining = Math.max(0, limit - timestamps.length);
  const retryAfterSecs = Math.ceil((resetAt - now) / 1000);

  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)), // Unix seconds
  };

  if (!allowed) {
    headers["Retry-After"] = String(retryAfterSecs);
  }

  return { allowed, remaining, resetAt, headers };
}

// ─── Pre-configured limiters for common tiers ────────────────────

/** 200 req/min — public read endpoints */
export function publicReadLimit(key: string): RateLimitResult {
  return rateLimit(key, { limit: 200, windowMs: 60_000 });
}

/** 60 req/min — authenticated write endpoints */
export function authWriteLimit(key: string): RateLimitResult {
  return rateLimit(key, { limit: 60, windowMs: 60_000 });
}

/** 10 req/min — auth endpoints (login, CSRF, password reset) */
export function authEndpointLimit(key: string): RateLimitResult {
  return rateLimit(key, { limit: 10, windowMs: 60_000 });
}

// ─── Helpers ────────────────────────────────────────────────────

/** Extract the client IP from a NextRequest for use as a rate-limit key. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/** Return a 429 response object with correct headers. */
export function rateLimitedResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({ error: "Too Many Requests — try again later." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        ...result.headers,
      },
    }
  );
}
