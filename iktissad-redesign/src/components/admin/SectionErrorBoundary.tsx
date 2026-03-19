/**
 * Section Error Boundary
 * IKTISSAD Design System
 *
 * Convenience wrapper around ErrorBoundary.
 * This is what page authors should import — they don't need to import
 * ErrorBoundary directly.
 *
 * Usage:
 *   <SectionErrorBoundary section="articles">
 *     <ArticlesTable />
 *   </SectionErrorBoundary>
 */

'use client';

import type { ReactNode } from 'react';
import ErrorBoundary from './ErrorBoundary';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface SectionErrorBoundaryProps {
  children: ReactNode;
  /** Section name shown in the fallback UI for debugging context */
  section?: string;
  /** Optional custom fallback — passed through to ErrorBoundary */
  fallback?: ReactNode;
  /** Optional error callback */
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function SectionErrorBoundary({
  children,
  section,
  fallback,
  onError,
}: SectionErrorBoundaryProps) {
  return (
    <ErrorBoundary section={section} fallback={fallback} onError={onError}>
      {children}
    </ErrorBoundary>
  );
}
