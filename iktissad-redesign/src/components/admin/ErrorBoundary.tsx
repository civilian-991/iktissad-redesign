/**
 * Admin Error Boundary
 * IKTISSAD Design System
 *
 * Reusable React Error Boundary class component.
 * Catches render errors in children and shows a graceful Arabic fallback UI.
 * Must be a class component — hooks do not support componentDidCatch.
 */

'use client';

import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw, Bug, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback UI — overrides the default Arabic fallback */
  fallback?: ReactNode;
  /** Name of the section (for error context), shown in the UI */
  section?: string;
  /** Called when an error is caught */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  detailsOpen: boolean;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      detailsOpen: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Always log to console with structured data
    console.error('[ErrorBoundary]', {
      section: this.props.section ?? 'unknown',
      error: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });

    // Optionally report to Sentry if loaded
    try {
      const sentry =
        (typeof window !== 'undefined' && (window as any).__sentry) ||
        (typeof window !== 'undefined' && (window as any).Sentry);
      if (sentry && typeof sentry.captureException === 'function') {
        sentry.captureException(error, { extra: { componentStack: info.componentStack } });
      }
    } catch {
      // Sentry not available — ignore silently
    }

    // Call the consumer callback if provided
    this.props.onError?.(error, info);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, detailsOpen: false });
  };

  private handleCopyError = async () => {
    const { error } = this.state;
    const text = [
      `القسم: ${this.props.section ?? 'غير محدد'}`,
      `الخطأ: ${error?.message ?? 'غير معروف'}`,
      '',
      error?.stack ?? '',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      toast.success('تم نسخ تفاصيل الخطأ إلى الحافظة');
    } catch {
      toast.error('تعذّر النسخ — يرجى نسخ التفاصيل يدويًا');
    }
  };

  private toggleDetails = () => {
    this.setState((prev) => ({ detailsOpen: !prev.detailsOpen }));
  };

  render() {
    const { hasError, error, detailsOpen } = this.state;
    const { children, fallback, section } = this.props;

    if (!hasError) return children;

    // Use custom fallback if provided
    if (fallback) return fallback;

    // Default Arabic fallback UI
    return (
      <div
        dir="rtl"
        className="rounded-xl border border-red-500/20 bg-red-950/20 p-6 text-start"
      >
        {/* Header */}
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle size={24} className="text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-[family-name:var(--font-display)] font-bold text-base mb-1">
              حدث خطأ في هذا القسم
            </h3>
            <p className="text-white/50 font-[family-name:var(--font-display)] text-sm">
              لم يتأثر باقي التطبيق
            </p>
            {section && (
              <p className="text-white/30 font-[family-name:var(--font-display)] text-xs mt-1">
                القسم: {section}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 text-white font-[family-name:var(--font-display)] text-sm rounded-lg transition-colors"
          >
            <RefreshCw size={14} />
            إعادة المحاولة
          </button>
          <button
            onClick={this.handleCopyError}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 font-[family-name:var(--font-display)] text-sm rounded-lg transition-colors"
          >
            <Bug size={14} />
            الإبلاغ عن مشكلة
          </button>
        </div>

        {/* Collapsible Error Details */}
        <div className="border-t border-white/5 pt-3">
          <button
            onClick={this.toggleDetails}
            className="flex items-center gap-2 text-white/30 hover:text-white/50 font-[family-name:var(--font-display)] text-xs transition-colors"
          >
            {detailsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {detailsOpen ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
          </button>
          {detailsOpen && error && (
            <div className="mt-3 p-3 bg-black/30 rounded-lg overflow-x-auto">
              <code className="text-red-300 text-xs font-mono whitespace-pre-wrap break-all">
                {error.message}
              </code>
            </div>
          )}
        </div>
      </div>
    );
  }
}
