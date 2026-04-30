'use client';

/**
 * ArticleAnalytics
 *
 * Invisible client component that tracks reading behavior:
 * - Scroll depth (passive scroll listener → max % reached)
 * - Read-through (IntersectionObserver on last paragraph > 80% visible)
 * - Time on page (1s interval counter)
 *
 * On unmount / beforeunload, POSTs data to /api/analytics/read.
 * Uses navigator.sendBeacon for beforeunload (guaranteed delivery).
 * SessionID persisted in sessionStorage for the lifetime of the tab.
 *
 * Returns null — no visible UI.
 */

import { useEffect, useRef } from 'react';

interface ArticleAnalyticsProps {
  articleId: string;
}

function getOrCreateSessionId(): string {
  try {
    const key = 'iktissad_session_id';
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
    return id;
  } catch {
    // sessionStorage blocked (private browsing, etc.)
    return crypto.randomUUID();
  }
}

export default function ArticleAnalytics({ articleId }: ArticleAnalyticsProps) {
  const sessionId = useRef<string>('');
  const timeOnPage = useRef<number>(0);
  const maxScrollDepth = useRef<number>(0);
  const readThrough = useRef<boolean>(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    sessionId.current = getOrCreateSessionId();

    // Time on page counter
    intervalRef.current = setInterval(() => {
      timeOnPage.current += 1;
    }, 1000);

    // Scroll depth tracker
    const handleScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const pct = Math.round((window.scrollY / scrollable) * 100);
      if (pct > maxScrollDepth.current) {
        maxScrollDepth.current = Math.min(pct, 100);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Read-through: watch last paragraph in article body
    const articleBody = document.querySelector('[data-article-body]');
    if (articleBody) {
      const paragraphs = articleBody.querySelectorAll('p');
      const lastParagraph = paragraphs[paragraphs.length - 1];
      if (lastParagraph) {
        observerRef.current = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.intersectionRatio >= 0.8) {
                readThrough.current = true;
                observerRef.current?.disconnect();
              }
            }
          },
          { threshold: 0.8 }
        );
        observerRef.current.observe(lastParagraph);
      }
    }

    // Send data function
    const sendData = (useBeacon: boolean) => {
      const payload = {
        articleId,
        sessionId: sessionId.current,
        timeOnPage: timeOnPage.current,
        scrollDepth: maxScrollDepth.current,
        readThrough: readThrough.current,
      };

      const url = '/api/analytics/read';
      const body = JSON.stringify(payload);

      if (useBeacon && typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      } else {
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        }).catch(() => {
          // Ignore analytics errors — non-critical
        });
      }
    };

    // beforeunload: use sendBeacon
    const handleBeforeUnload = () => {
      sendData(true);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup on unmount: use fetch with keepalive
    return () => {
      clearInterval(intervalRef.current!);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      observerRef.current?.disconnect();
      sendData(false);
    };
     
  }, [articleId]);

  return null;
}
