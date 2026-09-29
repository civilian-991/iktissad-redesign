/**
 * Anonymous first-party visitor id (the `ikt_sid` cookie, 30 days). A random
 * UUID with no link to identity; used for the metered paywall, reading
 * sessions and the audience counts on the rate card.
 */
export const VISITOR_COOKIE = 'ikt_sid';

export function getOrCreateVisitorId(): string {
  if (typeof document === 'undefined') return '';
  const existing = document.cookie
    .split('; ')
    .find((r) => r.startsWith(`${VISITOR_COOKIE}=`))
    ?.split('=')[1];
  if (existing) return existing;
  const id = crypto.randomUUID();
  document.cookie = `${VISITOR_COOKIE}=${id}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
  return id;
}
