/**
 * Server-side Cloudflare Turnstile verification helper.
 * Call this from API routes before processing any user-submitted form data.
 *
 * Required env vars:
 *   TURNSTILE_SECRET_KEY — from Cloudflare Dashboard → Turnstile → your site → Secret key
 */
export async function verifyTurnstile(
  token: string,
  ip?: string | null,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  // In dev without a secret, skip verification so local testing isn't blocked
  if (!secret) {
    return process.env.NODE_ENV === 'development';
  }

  if (!token) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.append('remoteip', ip);

  try {
    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      },
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
