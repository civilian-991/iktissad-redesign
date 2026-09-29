'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getOrCreateVisitorId } from '@/lib/visitor-id';

/**
 * Counts one page view per public page shown (including client-side
 * navigations) for the audience figures advertisers are sold on: monthly page
 * views, unique visitors, country and device split. First-party and
 * anonymous; admin and preview pages are not counted.
 */
export default function AudiencePing() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || /^\/(admin|preview|print|api)(\/|$)/.test(pathname)) return;
    const body = JSON.stringify({ visitorId: getOrCreateVisitorId() });
    if (!navigator.sendBeacon?.('/api/track/pageview', body)) {
      void fetch('/api/track/pageview', { method: 'POST', body, keepalive: true }).catch(() => {});
    }
  }, [pathname]);

  return null;
}
