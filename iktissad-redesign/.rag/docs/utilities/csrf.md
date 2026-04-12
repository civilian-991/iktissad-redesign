# Utility: CSRF Protection

File: `src/lib/csrf.ts`

Double-submit cookie pattern. A random token is set as a cookie and must also appear in the `X-CSRF-Token` request header on all state-mutating requests.

---

## Constants

```ts
export const CSRF_COOKIE = 'csrf-token';
export const CSRF_HEADER = 'x-csrf-token';
```

---

## Functions

### `generateCsrfToken(): string`
Returns a 64-char lowercase hex string (32 random bytes via `crypto.getRandomValues`).

### `validateCsrfToken(request: Request): boolean`
Extracts the token from both the `csrf-token` cookie and the `x-csrf-token` header, then compares them with a timing-safe comparison (XOR over all bytes). Returns `false` if either is missing or they don't match.

---

## Middleware enforcement (`src/proxy.ts`)

CSRF is enforced at the proxy/middleware layer for all API mutations (POST, PUT, PATCH, DELETE). Routes are exempt if they match `CSRF_EXEMPT_PATTERNS`:

```ts
const CSRF_EXEMPT_PATTERNS = [
  /^\/api\/webhooks\//,      // external webhook callers can't set cookies
  /^\/api\/auth\/csrf$/,     // the token-issuance endpoint itself
  /^\/api\/auth\/turnstile\//,
  /^\/api\/newsletter$/,     // public subscribe form
  /^\/api\/indexnow\//,
  /^\/monitoring/,
];
```

Non-exempt mutations that fail CSRF return `403 Forbidden` with body `{ error: "CSRF validation failed" }`.

---

## Client-side integration (`src/lib/api-client.ts`)

`api-client.ts` calls GET `/api/auth/csrf` once per page load, caches the token in module scope (`cachedCsrfToken`), and attaches it as `X-CSRF-Token: <token>` on every POST/PUT/PATCH/DELETE call automatically. No per-call configuration needed.

---

## Cookie: `csrf-token`

Set by GET `/api/auth/csrf`.  
Attributes: `SameSite=strict; HttpOnly=false; Path=/; Secure` (Secure in production).  
`HttpOnly=false` is intentional — the JS client needs to read it as a fallback (though the server-side route is the primary path).
