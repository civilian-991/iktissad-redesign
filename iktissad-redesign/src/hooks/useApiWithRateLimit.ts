/**
 * useApiWithRateLimit
 *
 * A thin SWR wrapper that surfaces rate-limit state alongside the usual
 * data/error/isLoading fields.  It polls the module-level rate-limit
 * window from api-client.ts every second so the UI can show a countdown
 * banner without each component re-implementing that logic.
 *
 * Usage:
 *   const { data, error, isLoading, isRateLimited, retryAfterSeconds } =
 *     useApiWithRateLimit<ApiResponse<Article[]>>(swrKey, swrFetcher);
 */

"use client";

import { useEffect, useRef, useState } from "react";
import useSWR, { type SWRConfiguration, type Key } from "swr";
import { getRateLimitSecondsRemaining, isRateLimited } from "@/lib/api-client";

export interface UseApiWithRateLimitResult<T> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  /** True while the client is in a 429 back-off window */
  isRateLimited: boolean;
  /** Seconds until the rate-limit window expires (0 when not rate-limited) */
  retryAfterSeconds: number;
  /** Trigger a manual revalidation */
  mutate: () => void;
}

export function useApiWithRateLimit<T>(
  key: Key,
  fetcher: (url: string) => Promise<T>,
  config?: SWRConfiguration<T>
): UseApiWithRateLimitResult<T> {
  const [rateLimitState, setRateLimitState] = useState<{
    active: boolean;
    seconds: number;
  }>({ active: false, seconds: 0 });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll rate-limit state every 500 ms.
  // We use setInterval (not useInterval) to avoid adding new deps.
  useEffect(() => {
    const tick = () => {
      const active = isRateLimited();
      const seconds = getRateLimitSecondsRemaining();
      setRateLimitState((prev) => {
        if (prev.active === active && prev.seconds === seconds) return prev;
        return { active, seconds };
      });
    };

    tick(); // run immediately
    intervalRef.current = setInterval(tick, 500);

    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, []);

  const { data, error, isLoading, mutate } = useSWR<T>(key, fetcher as any, {
    revalidateOnFocus: false,
    ...config,
  });

  return {
    data,
    error: error as Error | undefined,
    isLoading,
    isRateLimited: rateLimitState.active,
    retryAfterSeconds: rateLimitState.seconds,
    mutate: () => void mutate(),
  };
}
