'use client';

import { useEffect } from 'react';
import { csrfJsonHeaders } from '@/lib/csrf-client';

/**
 * Measures how long the reader actually spent on the article (visible time
 * only — a backgrounded tab doesn't count) and how far they scrolled, and
 * reports it when they leave. The opening read is recorded separately on
 * load; /api/track/article-read folds this closing event into that row.
 *
 * Feeds "average reading time" in the partner-content reports.
 */
export function useReadingBeacon(articleId: string | undefined, getSessionId: () => string) {
  useEffect(() => {
    if (!articleId) return;

    let visibleMs = 0;
    let visibleSince: number | null = document.visibilityState === 'visible' ? Date.now() : null;
    let maxDepth = 0;
    let headers: Record<string, string> | null = null;

    // The CSRF token has to be in hand before the page is torn down.
    void csrfJsonHeaders().then((h) => { headers = h; }).catch(() => {});

    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const depth = scrollable > 0 ? Math.round((window.scrollY / scrollable) * 100) : 100;
      if (depth > maxDepth) maxDepth = Math.min(100, depth);
    };

    const flush = () => {
      if (visibleSince !== null) {
        visibleMs += Date.now() - visibleSince;
        visibleSince = null;
      }
      const seconds = Math.round(visibleMs / 1000);
      if (seconds < 1 || !headers) return;
      void fetch('/api/track/article-read', {
        method: 'POST',
        headers,
        keepalive: true,
        body: JSON.stringify({
          articleId,
          sessionId: getSessionId(),
          timeOnPage: Math.min(seconds, 86400),
          scrollDepth: maxDepth,
          readThrough: maxDepth >= 90,
        }),
      }).catch(() => {});
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
      else visibleSince = Date.now();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      // Client-side navigation to another article unmounts without a pagehide.
      flush();
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, [articleId, getSessionId]);
}
