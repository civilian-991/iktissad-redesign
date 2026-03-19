'use client';

/**
 * useEditorPerformance
 *
 * Measures TipTap editor performance metrics:
 *   - editorMountTime:      ms from component mount to editor onCreate callback
 *   - avgKeystrokeLatency:  rolling average of keydown→DOM-update latency, sampled
 *                           every 10 keystrokes to keep overhead minimal
 *   - hydrationTime:        ms from page load (navigation start) to hook mount
 *
 * Calls reportSlowRender() when any metric exceeds its threshold.
 * Returns { editorMountTime, avgKeystrokeLatency, isSlowEditor }.
 *
 * SSR-safe: all Performance API calls are guarded by typeof window checks.
 * Zero production impact when removed — no side-effects outside this module.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { markStart, markEnd, measure, reportSlowRender } from '@/lib/perf';

// Thresholds (ms)
const MOUNT_THRESHOLD = 1_500;   // editor should be interactive within 1.5 s
const KEYSTROKE_THRESHOLD = 100; // keydown→update latency budget
const HYDRATION_THRESHOLD = 3_000;

export interface EditorPerfResult {
  /** Time in ms from component mount to editor onCreate. null until measured. */
  editorMountTime: number | null;
  /** Rolling average keystroke latency (ms). null until 10 keystrokes recorded. */
  avgKeystrokeLatency: number | null;
  /** true when any metric exceeds its threshold */
  isSlowEditor: boolean;
}

export function useEditorPerformance(): {
  result: EditorPerfResult;
  /** Call this inside useEditor onCreate callback */
  onEditorReady: () => void;
  /** Call this inside useEditor onUpdate callback */
  onEditorUpdate: () => void;
} {
  const mountTimeRef = useRef<number | null>(null);
  const keystrokeTimesRef = useRef<number[]>([]);
  const pendingKeystrokeRef = useRef<number | null>(null);
  const keystrokeCountRef = useRef(0);

  const [result, setResult] = useState<EditorPerfResult>({
    editorMountTime: null,
    avgKeystrokeLatency: null,
    isSlowEditor: false,
  });

  // ── Mount mark ────────────────────────────────────────────────
  useEffect(() => {
    markStart('editor');

    // Measure hydration time (navigation start → this hook mounting)
    if (typeof window !== 'undefined') {
      try {
        const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        if (navEntries.length > 0) {
          const hydrationMs = performance.now(); // relative to navigation start
          if (hydrationMs > HYDRATION_THRESHOLD) {
            reportSlowRender('AdminPageHydration', hydrationMs, HYDRATION_THRESHOLD);
          }
        }
      } catch {
        // Performance API not fully available — safe to ignore
      }
    }

    // Keystroke listener — records keydown time, resolved in onEditorUpdate
    const handleKeydown = () => {
      if (typeof window === 'undefined') return;
      pendingKeystrokeRef.current = performance.now();
    };

    document.addEventListener('keydown', handleKeydown, { capture: true, passive: true });

    return () => {
      document.removeEventListener('keydown', handleKeydown, { capture: true });
    };
  }, []);

  // ── Editor ready callback ─────────────────────────────────────
  const onEditorReady = useCallback(() => {
    markEnd('editor');
    const duration = measure('editor:mount', 'editor:start', 'editor:end');
    if (duration === null) return;

    mountTimeRef.current = duration;
    const isSlow = duration > MOUNT_THRESHOLD;

    if (isSlow) {
      reportSlowRender('RichTextEditor:mount', duration, MOUNT_THRESHOLD);
    }

    setResult((prev) => ({
      ...prev,
      editorMountTime: duration,
      isSlowEditor: isSlow || prev.isSlowEditor,
    }));
  }, []);

  // ── Editor update callback ────────────────────────────────────
  const onEditorUpdate = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (pendingKeystrokeRef.current === null) return;

    const latency = performance.now() - pendingKeystrokeRef.current;
    pendingKeystrokeRef.current = null;
    keystrokeCountRef.current += 1;

    // Sample every 10 keystrokes to keep noise down
    if (keystrokeCountRef.current % 10 !== 0) return;

    keystrokeTimesRef.current.push(latency);
    // Keep only the last 5 samples (rolling window)
    if (keystrokeTimesRef.current.length > 5) {
      keystrokeTimesRef.current.shift();
    }

    const avg =
      keystrokeTimesRef.current.reduce((a, b) => a + b, 0) /
      keystrokeTimesRef.current.length;

    const isSlow = avg > KEYSTROKE_THRESHOLD;
    if (isSlow) {
      reportSlowRender('RichTextEditor:keystroke', avg, KEYSTROKE_THRESHOLD);
    }

    setResult((prev) => ({
      ...prev,
      avgKeystrokeLatency: Math.round(avg),
      isSlowEditor: isSlow || (prev.editorMountTime !== null && prev.editorMountTime > MOUNT_THRESHOLD),
    }));
  }, []);

  return { result, onEditorReady, onEditorUpdate };
}
