/**
 * Performance measurement utilities for admin monitoring.
 * Uses the Web Performance API (window.performance) — SSR-safe.
 *
 * All functions are no-ops on the server (typeof window === 'undefined').
 */

const IS_DEV = process.env.NODE_ENV === 'development';
const IS_PROD = process.env.NODE_ENV === 'production';

// ─── Mark helpers ────────────────────────────────────────────────

/**
 * Place a named start mark in the performance timeline.
 * Safe to call on the server — becomes a no-op.
 */
export function markStart(name: string): void {
  if (typeof window === 'undefined') return;
  try {
    performance.mark(`${name}:start`);
  } catch {
    // Silently swallow — Performance API may not be available in all environments
  }
}

/**
 * Place a named end mark in the performance timeline.
 */
export function markEnd(name: string): void {
  if (typeof window === 'undefined') return;
  try {
    performance.mark(`${name}:end`);
  } catch {
    // Silently swallow
  }
}

/**
 * Measure the duration between two marks.
 * Returns duration in milliseconds, or null if measurement fails.
 */
export function measure(name: string, startMark: string, endMark: string): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const entry = performance.measure(name, startMark, endMark);
    return entry.duration;
  } catch {
    return null;
  }
}

// ─── Report slow renders ─────────────────────────────────────────

export interface PerfReport {
  component: string;
  duration: number;
  page: string;
  timestamp: number;
}

/**
 * Report a slow render event.
 *
 * - In development: logs to console.warn so it's immediately visible.
 * - In production: POSTs to /api/admin/perf-report (fire-and-forget,
 *   does not block the calling code). Ready for Sentry integration.
 *
 * @param componentName  Display name of the component being measured
 * @param durationMs     Measured duration in milliseconds
 * @param threshold      Duration threshold above which a report is fired (default 200ms)
 */
export function reportSlowRender(
  componentName: string,
  durationMs: number,
  threshold = 200
): void {
  if (typeof window === 'undefined') return;
  if (durationMs < threshold) return;

  const report: PerfReport = {
    component: componentName,
    duration: Math.round(durationMs),
    page: window.location.pathname,
    timestamp: Date.now(),
  };

  if (IS_DEV) {
    console.warn(
      `[perf] Slow render detected — ${componentName}: ${Math.round(durationMs)}ms (threshold: ${threshold}ms)`,
      report
    );
    return;
  }

  if (IS_PROD) {
    // Fire-and-forget — intentionally not awaited
    fetch('/api/admin/perf-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
      // Use keepalive so the request survives page unload
      keepalive: true,
    }).catch(() => {
      // Silently swallow — perf reporting must never break the UI
    });
  }
}
