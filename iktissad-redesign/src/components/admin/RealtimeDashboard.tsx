'use client';

/**
 * RealtimeDashboard
 *
 * Compact widget showing:
 * - Live active subscriber count via Supabase Realtime
 * - Current active readers (polls /api/analytics/active every 30s)
 *
 * Used in the admin dashboard sidebar or topbar area.
 */

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Users, BookOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { swrFetcher } from '@/lib/api-client';
import type { ApiResponse } from '@/types';

interface RealtimeDashboardProps {
  initialActiveSubscribers?: number;
}

export default function RealtimeDashboard({ initialActiveSubscribers = 0 }: RealtimeDashboardProps) {
  const [activeSubscribers, setActiveSubscribers] = useState(initialActiveSubscribers);

  // Poll active readers every 30s
  const { data: activeReadersRes } = useSWR<ApiResponse<{ count: number }>>(
    '/api/analytics/active',
    swrFetcher,
    { refreshInterval: 30000, revalidateOnFocus: false }
  );
  const activeReaders = activeReadersRes?.data?.count ?? 0;

  // Supabase Realtime: watch subscribers table for INSERT/UPDATE
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel('realtime-subscribers')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'subscribers' },
        () => {
          setActiveSubscribers((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'subscribers' },
        (payload: { new: { status: string } }) => {
          const newStatus = payload.new?.status;
          const wasActive = ['active', 'trialing'].includes(newStatus);
          setActiveSubscribers((prev) =>
            wasActive ? Math.max(0, prev + 1) : Math.max(0, prev - 1)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="flex items-center gap-4 px-3 py-2 bg-midnight/50 border border-gold/10 rounded-xl">
      {/* Active Subscribers */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <div className="absolute inset-0 w-2 h-2 bg-emerald-400 rounded-full opacity-30 animate-ping" />
        </div>
        <Users size={14} className="text-white/50" />
        <span className="text-white font-[family-name:var(--font-display)] text-sm font-semibold">
          {activeSubscribers.toLocaleString('ar-SA')}
        </span>
        <span className="text-white/40 text-xs font-[family-name:var(--font-display)] hidden sm:inline">
          مشترك نشط
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-white/10" />

      {/* Active Readers */}
      <div className="flex items-center gap-2">
        <BookOpen size={14} className="text-gold" />
        <span className="text-white font-[family-name:var(--font-display)] text-sm font-semibold">
          {activeReaders.toLocaleString('ar-SA')}
        </span>
        <span className="text-white/40 text-xs font-[family-name:var(--font-display)] hidden sm:inline">
          قارئ الآن
        </span>
      </div>
    </div>
  );
}
