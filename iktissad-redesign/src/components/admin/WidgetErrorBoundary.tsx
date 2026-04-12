/**
 * Widget Error Boundary
 * IKTISSAD Design System
 *
 * Minimal error boundary for dashboard widgets and stats cards.
 * Shows a compact grey fallback card — no expanded error details.
 * Keeps widgets from taking down the entire dashboard on failure.
 *
 * Usage:
 *   <WidgetErrorBoundary>
 *     <StatsCard ... />
 *   </WidgetErrorBoundary>
 */

'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { RefreshCw } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface WidgetErrorBoundaryProps {
  children: ReactNode;
  /** Widget label shown alongside the error message */
  label?: string;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default class WidgetErrorBoundary extends Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  constructor(props: WidgetErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): WidgetErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[WidgetErrorBoundary]', {
      label: this.props.label ?? 'widget',
      error: error.message,
      componentStack: info.componentStack,
    });

    // Optionally report to Sentry if loaded
    try {
      const sentry =
        (typeof window !== 'undefined' && (window as any).__sentry) ||
        (typeof window !== 'undefined' && (window as any).Sentry);
      if (sentry && typeof sentry.captureException === 'function') {
        sentry.captureException(error);
      }
    } catch {
      // Sentry not available — ignore silently
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    // Minimal compact fallback — intentionally small for dashboard cards
    return (
      <div
        dir="rtl"
        className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex flex-col items-center justify-center gap-3 min-h-[80px] text-start"
      >
        <p className="text-white/30 font-[family-name:var(--font-display)] text-sm text-center">
          تعذّر تحميل هذا الجزء
        </p>
        <button
          onClick={this.handleRetry}
          title="إعادة المحاولة"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/60 rounded-lg transition-colors"
        >
          <RefreshCw size={12} />
          <span className="font-[family-name:var(--font-display)] text-xs">إعادة المحاولة</span>
        </button>
      </div>
    );
  }
}
