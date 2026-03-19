/**
 * RateLimitBanner
 *
 * A subtle top banner that appears inside the admin layout whenever
 * the API client is in a 429 back-off window.
 *
 * It polls `isRateLimited()` / `getRateLimitSecondsRemaining()` from
 * api-client.ts every 500 ms and renders a dismissible amber bar with
 * an Arabic countdown message.
 *
 * Renders nothing when not rate-limited — zero DOM overhead in the
 * normal case.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, X } from 'lucide-react';
import {
  isRateLimited,
  getRateLimitSecondsRemaining,
} from '@/lib/api-client';

export default function RateLimitBanner() {
  const [visible, setVisible] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const tick = () => {
      const limited = isRateLimited();
      const secs = getRateLimitSecondsRemaining();

      if (limited) {
        setSeconds(secs);
        // Reset dismiss flag when a NEW rate-limit window starts
        setDismissed(false);
        setVisible(true);
      } else {
        setVisible(false);
        setSeconds(0);
      }
    };

    tick();
    intervalRef.current = setInterval(tick, 500);

    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, []);

  const show = visible && !dismissed;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="rate-limit-banner"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-3 bg-amber-900/40 border-b border-amber-500/30 px-6 py-2.5 text-amber-200">
            {/* Icon + message */}
            <div className="flex items-center gap-2 min-w-0">
              <Clock size={14} className="shrink-0 text-amber-400" />
              <span className="text-xs font-[family-name:var(--font-display)] leading-tight">
                {seconds > 0
                  ? `تم تجاوز حد الطلبات — جارٍ الانتظار ${seconds} ثانية`
                  : 'تم تجاوز حد الطلبات — جارٍ الانتظار…'}
              </span>
            </div>

            {/* Countdown pill */}
            {seconds > 0 && (
              <span className="shrink-0 tabular-nums text-xs font-[family-name:var(--font-accent)] bg-amber-500/20 border border-amber-500/30 rounded-full px-2.5 py-0.5 text-amber-300">
                {seconds}s
              </span>
            )}

            {/* Dismiss */}
            <button
              onClick={() => setDismissed(true)}
              aria-label="إغلاق"
              className="shrink-0 p-1 rounded hover:bg-amber-500/20 transition-colors text-amber-400 hover:text-amber-200"
            >
              <X size={12} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
