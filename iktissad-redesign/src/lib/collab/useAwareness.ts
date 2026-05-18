/**
 * useAwareness — React hook for collaborative presence state
 *
 * Subscribes to a SupabaseProvider's awareness updates and returns
 * the list of other connected users (own state is filtered out).
 * Stale users (lastSeen > 30s ago) are pruned every 2 seconds.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import type { SupabaseProvider, AwarenessState } from './SupabaseProvider';

const STALE_THRESHOLD_MS = 30_000;
const PRUNE_INTERVAL_MS = 2_000;

export function useAwareness(provider: SupabaseProvider | null): AwarenessState[] {
  const [states, setStates] = useState<AwarenessState[]>([]);
  const pruneTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!provider) {
      // Only reset when we actually have stale state — avoids cascading re-renders
      setStates((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    // Initial state
    setStates(provider.getAwarenessStates());

    // Subscribe to updates
    const handleUpdate = (newStates: AwarenessState[]) => {
      setStates(newStates);
    };
    provider.onAwareness(handleUpdate);

    // Periodically prune stale users (those who disconnected without cleanup)
    pruneTimerRef.current = setInterval(() => {
      setStates((prev) => {
        const now = Date.now();
        const fresh = prev.filter((s) => now - s.lastSeen < STALE_THRESHOLD_MS);
        // Only trigger re-render if something actually changed
        return fresh.length === prev.length ? prev : fresh;
      });
    }, PRUNE_INTERVAL_MS);

    return () => {
      provider.offAwareness(handleUpdate);
      if (pruneTimerRef.current !== null) {
        clearInterval(pruneTimerRef.current);
        pruneTimerRef.current = null;
      }
    };
  }, [provider]);

  return states;
}
