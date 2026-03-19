'use client';

/**
 * useArticlePresence
 *
 * Joins a Supabase Realtime Presence channel for a given article.
 * Tracks the current user's presence and returns the list of OTHER users
 * who are currently viewing/editing the same article.
 *
 * Channel name: `article-presence:{articleId}`
 * No DB writes — entirely ephemeral Realtime Presence.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface PresenceUser {
  userId: string;
  name: string;
  avatarUrl?: string;
  joinedAt: string;
}

interface UseArticlePresenceOptions {
  /** The article ID to track presence on. Pass null/empty to skip. */
  articleId: string | null | undefined;
  /** Current user's info — must be provided to join the channel. */
  currentUser: {
    userId: string;
    name: string;
    avatarUrl?: string;
  } | null;
}

interface UseArticlePresenceResult {
  /** All other users currently present on this article (self excluded). */
  presentUsers: PresenceUser[];
  /** Whether the Realtime channel is currently subscribed. */
  isConnected: boolean;
}

export function useArticlePresence({
  articleId,
  currentUser,
}: UseArticlePresenceOptions): UseArticlePresenceResult {
  const [presentUsers, setPresentUsers] = useState<PresenceUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Stable ref so the effect closure always has the latest userId without
  // triggering re-subscription every time the parent re-renders.
  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    if (!articleId || !currentUser?.userId) return;

    const supabase = createClient();
    const channelName = `article-presence:${articleId}`;

    const channel = supabase.channel(channelName, {
      config: {
        presence: { key: currentUser.userId },
      },
    });

    const syncPresence = () => {
      const state = channel.presenceState<PresenceUser>();
      const others: PresenceUser[] = [];

      for (const [key, entries] of Object.entries(state)) {
        if (key === currentUserRef.current?.userId) continue;
        // Each key may have multiple entries (tabs). Take the most recent.
        const entry = (entries as PresenceUser[])[0];
        if (entry) others.push(entry);
      }

      setPresentUsers(others);
    };

    channel
      .on('presence', { event: 'sync' }, syncPresence)
      .on('presence', { event: 'join' }, syncPresence)
      .on('presence', { event: 'leave' }, syncPresence)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          const payload: PresenceUser = {
            userId: currentUser.userId,
            name: currentUser.name,
            avatarUrl: currentUser.avatarUrl,
            joinedAt: new Date().toISOString(),
          };
          await channel.track(payload);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
        }
      });

    return () => {
      setIsConnected(false);
      setPresentUsers([]);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId, currentUser?.userId]);

  return { presentUsers, isConnected };
}
