'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Radio, Clock, User } from 'lucide-react';
import { useTranslation, useFormatters } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api-client';
import { sanitizeLiveBlogHtml } from '@/lib/sanitize';
import type { ApiResponse } from '@/types';

interface LiveBlogUpdate {
  id: string;
  content: string;
  created_at: string;
  users?: { name: string; avatar?: string } | null;
}

interface LiveBlogData {
  id: string;
  article_id: string;
  status: 'active' | 'ended';
  started_at: string;
  ended_at: string | null;
  updates: LiveBlogUpdate[];
}

interface LiveBlogProps {
  articleId: string;
}

export default function LiveBlog({ articleId }: LiveBlogProps) {
  const { t } = useTranslation();
  const { fmtTime } = useFormatters();
  const [updates, setUpdates] = useState<LiveBlogUpdate[]>([]);
  const [blogData, setBlogData] = useState<LiveBlogData | null>(null);
  const [newUpdateFlash, setNewUpdateFlash] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch active live blog for this article
  const { data } = useSWR<ApiResponse<LiveBlogData[]>>(
    `/api/live-blogs?articleId=${articleId}&status=active`,
    swrFetcher,
    { refreshInterval: 30000 }
  );

  const activeBlog = (data?.data as unknown as LiveBlogData[])?.[0] ?? null;

  useEffect(() => {
    if (!activeBlog) return;
    setBlogData(activeBlog);

    // Fetch updates for this blog
    fetch(`/api/live-blogs/${activeBlog.id}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data?.updates) {
          setUpdates(res.data.updates);
        }
      })
      .catch(console.error);
  }, [activeBlog?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to realtime updates
  useEffect(() => {
    if (!blogData?.id) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`live-blog-${blogData.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_blog_updates',
          filter: `live_blog_id=eq.${blogData.id}`,
        },
        (payload) => {
          const newUpdate = payload.new as LiveBlogUpdate;
          setUpdates((prev) => [newUpdate, ...prev]);
          setNewUpdateFlash(newUpdate.id);
          setTimeout(() => setNewUpdateFlash(null), 3000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [blogData?.id]);

  if (!blogData) return null;

  const isActive = blogData.status === 'active';

  return (
    <div className="my-8 border border-sand/60 bg-paper" ref={containerRef}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 bg-obsidian/[0.03] border-b border-sand/60">
        {isActive && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-600 text-white text-[10px] font-[family-name:var(--font-display)] font-black uppercase tracking-wider rounded-sm animate-pulse">
            <Radio size={10} />
            {t('engagement.liveBlog.live')}
          </span>
        )}
        {!isActive && (
          <span className="px-2.5 py-1 bg-charcoal/10 text-charcoal/50 text-[10px] font-[family-name:var(--font-display)] font-black uppercase tracking-wider rounded-sm">
            {t('engagement.liveBlog.ended')}
          </span>
        )}
        <span className="text-[11px] text-charcoal/40 font-[family-name:var(--font-display)]">
          {t('engagement.liveBlog.updates_count').replace('{count}', String(updates.length))}
        </span>
      </div>

      {/* Updates list */}
      <div className="max-h-[500px] overflow-y-auto divide-y divide-sand/40">
        {updates.map((update) => (
          <div
            key={update.id}
            className={`px-5 py-4 transition-colors duration-1000 ${
              newUpdateFlash === update.id ? 'bg-gold/10' : ''
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Clock size={10} className="text-charcoal/30" />
              <time className="text-[10px] font-[family-name:var(--font-display)] text-charcoal/40">
                {fmtTime(update.created_at)}
              </time>
              {update.users?.name && (
                <>
                  <span className="text-charcoal/15">·</span>
                  <span className="flex items-center gap-1 text-[10px] text-charcoal/40">
                    <User size={9} />
                    {update.users.name}
                  </span>
                </>
              )}
            </div>
            <div
              className="text-[14px] font-[family-name:var(--font-display)] text-ink leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitizeLiveBlogHtml(update.content) }}
            />
          </div>
        ))}
        {updates.length === 0 && (
          <div className="px-5 py-8 text-center text-[13px] text-charcoal/30 font-[family-name:var(--font-display)]">
            {t('engagement.liveBlog.new_update')}...
          </div>
        )}
      </div>
    </div>
  );
}

/** Small badge shown on article cards when a live blog is active */
export function LiveBlogBadge() {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-600 text-white text-[9px] font-[family-name:var(--font-display)] font-black uppercase tracking-wider rounded-sm">
      <Radio size={8} className="animate-pulse" />
      {t('engagement.liveBlog.live')}
    </span>
  );
}
