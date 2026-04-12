# Utility: Rate Limiting

File: `src/lib/rate-limit.ts`

In-memory sliding window rate limiter using a `Map<string, number[]>` of timestamps. No external dependency (Redis-free). Stale entries are purged every 5 minutes.

---

## Pre-configured tiers

| Export | Window | Max requests | Typical use |
|--------|--------|-------------|-------------|
| `publicReadLimit(key)` | 60 s | 200 | Public GET endpoints (articles, search) |
| `authWriteLimit(key)` | 60 s | 60 | Authenticated mutation routes |
| `authEndpointLimit(key)` | 60 s | 10 | Sensitive auth endpoints (login, 2FA, CSRF) |

---

## Usage pattern

```ts
import { authEndpointLimit, getClientIp, rateLimitedResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const rl = authEndpointLimit(`my-endpoint:${getClientIp(request)}`);
  if (!rl.allowed) return rateLimitedResponse(rl);
  // ... handler logic
}
```

---

## `RateLimitResult` shape

```ts
interface RateLimitResult {
  allowed: boolean;
  remaining: number;   // requests left in current window
  resetAt: number;     // Unix ms when oldest request expires
}
```

---

## Helper functions

### `getClientIp(request: NextRequest): string`
Reads `x-forwarded-for` → `x-real-ip` → `"unknown"`. Used to build per-IP rate limit keys.

### `rateLimitedResponse(rl: RateLimitResult): NextResponse`
Returns `429 Too Many Requests` with:
- Body: `{ error: "Too many requests" }`
- Headers: `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Notes
- State is in-process memory. In a multi-instance deployment (multiple Vercel function instances), each instance has independent counters. For strict per-user rate limiting across instances, replace with Redis/Upstash.
- Key format convention: `"<endpoint-name>:<ip>"` e.g. `"2fa-recover:203.0.113.42"`
