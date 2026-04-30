'use client';

/**
 * PagePerfTracker
 *
 * Lightweight client component that measures time-to-interactive (TTI)
 * for admin pages and reports slow pages via reportSlowRender().
 *
 * How it works:
 *   1. Records performance.now() immediately when the component mounts.
 *   2. In a useEffect (runs after first paint + hydration), records the
 *      elapsed time as the TTI approximation.
 *   3. If TTI > 3000ms, calls reportSlowRender() which either warns in
 *      the console (dev) or POSTs to /api/admin/perf-report (prod).
 *
 * This component is intentionally zero-UI — it renders nothing visible.
 * Add it once to the admin layout; it will track every admin page.
 *
 * SSR-safe: all Performance API calls are guarded by typeof window checks.
 */

import { useEffect, useState } from 'react';
import { reportSlowRender } from '@/lib/perf';

const TTI_THRESHOLD_MS = 3_000;

export default function PagePerfTracker() {
  // Capture mount time via useState lazy initializer — React's documented
  // pattern for impure init reads (compiler purity rule allows it here).
  const [mountTime] = useState(() =>
    typeof window !== 'undefined' ? performance.now() : 0,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // At this point the page is interactive (useEffect fires after paint).
    const tti = performance.now() - mountTime;

    if (process.env.NODE_ENV === 'development') {
      console.debug(`[perf] TTI for ${window.location.pathname}: ${Math.round(tti)}ms`);
    }

    reportSlowRender('AdminPage:TTI', tti, TTI_THRESHOLD_MS);
    // Runs once after first paint — mountTime is stable across renders
  }, [mountTime]);

  return null;
}
