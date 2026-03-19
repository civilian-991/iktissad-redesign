/**
 * Async Error Boundary
 * IKTISSAD Design System
 *
 * Error boundary for async data-loading sections.
 * Combines React Suspense + ErrorBoundary so callers get both:
 *   - A skeleton/loading state while data is being fetched
 *   - A graceful Arabic error state if the async render fails
 *
 * Usage:
 *   <AsyncErrorBoundary section="analytics" loadingFallback={<SkeletonLoader />}>
 *     <Suspense>
 *       <AsyncDataComponent />
 *     </Suspense>
 *   </AsyncErrorBoundary>
 *
 * Or with the built-in skeleton (default):
 *   <AsyncErrorBoundary section="analytics">
 *     <AsyncDataComponent />
 *   </AsyncErrorBoundary>
 */

'use client';

import { Suspense, type ReactNode } from 'react';
import ErrorBoundary from './ErrorBoundary';

// ═══════════════════════════════════════════════════════════════
// DEFAULT SKELETON LOADER
// ═══════════════════════════════════════════════════════════════

function DefaultSkeletonLoader() {
  return (
    <div className="space-y-3 animate-pulse" aria-label="جار التحميل">
      <div className="h-8 bg-white/5 rounded-lg w-1/3" />
      <div className="h-4 bg-white/5 rounded w-full" />
      <div className="h-4 bg-white/5 rounded w-5/6" />
      <div className="h-4 bg-white/5 rounded w-4/6" />
      <div className="h-32 bg-white/5 rounded-xl mt-4" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface AsyncErrorBoundaryProps {
  children: ReactNode;
  /** Section name for error context */
  section?: string;
  /**
   * Fallback shown while Suspense is loading.
   * Defaults to a generic skeleton loader.
   */
  loadingFallback?: ReactNode;
  /** Custom error fallback — passed through to ErrorBoundary */
  errorFallback?: ReactNode;
  /** Optional error callback */
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function AsyncErrorBoundary({
  children,
  section,
  loadingFallback,
  errorFallback,
  onError,
}: AsyncErrorBoundaryProps) {
  const suspenseFallback = loadingFallback ?? <DefaultSkeletonLoader />;

  return (
    <ErrorBoundary section={section} fallback={errorFallback} onError={onError}>
      <Suspense fallback={suspenseFallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}
