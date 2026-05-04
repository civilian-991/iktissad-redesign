import { NextResponse, type NextRequest } from 'next/server';

// ─── Constants ───────────────────────────────────────────────────

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * API routes that are called by external services or don't require CSRF.
 * Pattern matched against request.nextUrl.pathname.
 */
const CSRF_EXEMPT_PATTERNS = [
  /^\/api\/webhooks\//,          // Payment / external webhooks (use HMAC sig instead)
  /^\/api\/auth\/csrf$/,         // CSRF token endpoint itself
  /^\/api\/auth\/turnstile$/,    // Bot-check endpoint (no session yet)
  /^\/api\/newsletter$/,         // Public newsletter signup
  /^\/api\/indexnow\//,          // Search-engine ping (no session)
  /^\/monitoring/,               // Sentry tunnel
];

// ─── CSRF validation (double-submit cookie) ──────────────────────

function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_PATTERNS.some((re) => re.test(pathname));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function csrfForbidden(): NextResponse {
  return new NextResponse(
    JSON.stringify({ error: 'Invalid CSRF token' }),
    { status: 403, headers: { 'Content-Type': 'application/json' } }
  );
}

// ─── Proxy handler ───────────────────────────────────────────────

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();

  // ── 1. CSRF enforcement for API mutations ──────────────────────
  // Applied at the proxy layer so every POST/PUT/PATCH/DELETE route
  // is protected without touching individual route files.
  if (
    pathname.startsWith('/api/') &&
    MUTATION_METHODS.has(method) &&
    !isCsrfExempt(pathname)
  ) {
    const cookieToken = request.cookies.get('csrf-token')?.value;
    const headerToken = request.headers.get('x-csrf-token');

    if (!cookieToken || !headerToken || !timingSafeEqual(cookieToken, headerToken)) {
      return csrfForbidden();
    }
  }

  // ── 2. CSP nonce for HTML page routes ─────────────────────────
  // API routes return JSON — CSP headers are irrelevant there.
  if (!pathname.startsWith('/api/')) {
    const nonce = btoa(crypto.randomUUID());

    const cspHeader = [
      `default-src 'self'`,
      `script-src 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com https://*.googletagmanager.com https://*.google-analytics.com https://*.googletagservices.com https://securepubads.g.doubleclick.net https://*.mastercard.com.au https://*.mastercard.com`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `img-src 'self' data: blob: https:`,
      `font-src 'self' data: https://fonts.gstatic.com`,
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://www.googletagmanager.com https://challenges.cloudflare.com https://sentry.io https://*.sentry.io https://*.mastercard.com.au https://*.mastercard.com`,
      `frame-src 'self' https://challenges.cloudflare.com https://*.mastercard.com.au https://*.mastercard.com https://*.youtube.com https://www.youtube-nocookie.com https://securepubads.g.doubleclick.net`,
      `media-src 'self' https:`,
      `worker-src 'self' blob:`,
      `object-src 'none'`,
      `frame-ancestors 'none'`,
      `form-action 'self' https://*.mastercard.com.au https://*.mastercard.com`,
      `base-uri 'self'`,
      `upgrade-insecure-requests`,
    ].join('; ');

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-nonce', nonce);

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set('Content-Security-Policy', cspHeader);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static assets and image optimisation
    {
      source:
        '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
