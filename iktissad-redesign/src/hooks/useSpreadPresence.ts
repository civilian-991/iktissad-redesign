'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Tracks who else is currently editing the same spread via Supabase Realtime Presence.
 * Returns an array of other users' email addresses / identifiers.
 */
export function useSpreadPresence(
  issueId: string,
  spreadId: string,
  userEmail: string
): string[] {
  const [presentUsers, setPresentUsers] = useState<string[]>([]);

  useEffect(() => {
    // Skip if we don't have a valid spread yet
    if (!spreadId || !issueId || !userEmail) return;

    const supabase = createClient();
    const channelName = `spread-editor-${issueId}-${spreadId}`;

    const channel = supabase.channel(channelName, {
      config: { presence: { key: userEmail } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{ editing_since: string }>();
        const others = Object.keys(state).filter((k) => k !== userEmail);
        setPresentUsers(others);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        if (key !== userEmail) {
          setPresentUsers((prev) => (prev.includes(key) ? prev : [...prev, key]));
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setPresentUsers((prev) => prev.filter((u) => u !== key));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ editing_since: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [issueId, spreadId, userEmail]);

  return presentUsers;
}
