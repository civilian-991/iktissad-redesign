/**
 * BreakingNewsTicker
 *
 * Displays a horizontally scrolling strip of breaking news headlines.
 * Fetches GET /api/articles?breaking=true&pageSize=5, polling every 60 s.
 * Also subscribes to Supabase Realtime postgres_changes for instant updates
 * when breaking articles are published or un-flagged.
 *
 * NOTE — Realtime requirement:
 *   For postgres_changes to fire, the `articles` table must be added to the
 *   Supabase Realtime publication in the Supabase dashboard:
 *     Database → Replication → supabase_realtime → Add table → articles
 *
 * Dismissible per session via sessionStorage.
 * RTL: the marquee animation scrolls right-to-left (text moves from right edge
 * toward the left edge, which is the natural reading direction in Arabic).
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Zap } from 'lucide-react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import { useTranslation } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import type { ApiResponse, Article } from '@/types';

const SESSION_KEY = 'iktissad_breaking_dismissed';

export default function BreakingNewsTicker() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  // Read sessionStorage on mount (client-only)
  useEffect(() => {
    try {
      const val = sessionStorage.getItem(SESSION_KEY);
      setDismissed(val === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  const { data, mutate } = useSWR<ApiResponse<Article[]>>(
    '/api/articles?breaking=true&pageSize=5',
    swrFetcher,
    { refreshInterval: 60000 }
  );

  // Supabase Realtime subscription for instant breaking-news updates.
  // Triggers SWR revalidation on INSERT (new breaking article) or UPDATE
  // (is_breaking toggled on/off), so the ticker stays in sync without
  // waiting for the 60-second polling interval.
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('breaking-news')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'articles',
          filter: 'is_breaking=eq.true',
        },
        () => {
          // A new breaking article was published — refresh the ticker immediately
          mutate();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'articles',
        },
        () => {
          // An article was updated — is_breaking may have been toggled off
          mutate();
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mutate]);

  const articles = data?.data ?? [];

  if (dismissed || articles.length === 0) return null;

  const handleDismiss = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      // sessionStorage unavailable — dismiss in memory only
    }
    setDismissed(true);
  };

  return (
    <div
      className="breaking-news-ticker no-print relative flex items-center overflow-hidden bg-red-600 text-white"
      style={{ height: '40px' }}
      dir="rtl"
    >
      {/* "عاجل" badge */}
      <div className="flex-none flex items-center gap-1.5 px-3 h-full bg-red-700 z-10 shrink-0">
        <Zap size={13} className="fill-white text-white" />
        <span className="font-[family-name:var(--font-display)] font-black text-xs tracking-wider whitespace-nowrap">
          {t('breaking.label')}
        </span>
        {/* Live indicator — pulsing green dot when Realtime is connected */}
        {realtimeConnected && (
          <span
            className="relative flex h-2 w-2 shrink-0"
            title={t('breaking.liveIndicator')}
            aria-label={t('breaking.liveIndicator')}
          >
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
          </span>
        )}
      </div>

      {/* Scrolling headlines */}
      <div className="flex-1 overflow-hidden h-full flex items-center">
        <div className="flex items-center gap-0 animate-marquee-rtl whitespace-nowrap">
          {/* Duplicate list so the animation loops seamlessly */}
          {[...articles, ...articles].map((article, idx) => (
            <span key={`${article.id}-${idx}`} className="inline-flex items-center">
              <Link
                href={`/${article.slug}`}
                className="text-xs font-[family-name:var(--font-display)] text-white/90 hover:text-white transition-colors px-6 whitespace-nowrap"
              >
                {article.title}
              </Link>
              <span className="text-red-400 select-none">•</span>
            </span>
          ))}
        </div>
      </div>

      {/* Dismiss button — sits at the logical start (left in RTL) */}
      <button
        onClick={handleDismiss}
        className="flex-none flex items-center justify-center w-9 h-full bg-red-700 hover:bg-red-800 transition-colors shrink-0"
        aria-label={t('breaking.dismiss')}
        dir="ltr"
      >
        <X size={14} />
      </button>

      {/* Fade gradient on the badge edge to blend into the marquee */}
      <div className="pointer-events-none absolute top-0 right-[calc(4.5rem)] h-full w-8 bg-gradient-to-l from-red-600 to-transparent z-10" />
    </div>
  );
}
