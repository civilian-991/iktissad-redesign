'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { MagazineSection, MagazineSpread } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SpreadProgressBarProps {
  totalSpreads: number;
  currentSpread: number;
  onNavigate: (index: number) => void;
  sections: MagazineSection[];
  spreads?: MagazineSpread[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SpreadProgressBar({
  totalSpreads,
  currentSpread,
  onNavigate,
  sections,
  spreads = [],
}: SpreadProgressBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [tooltipX, setTooltipX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const barRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef(false);

  const fillPercent = totalSpreads > 1
    ? (currentSpread / (totalSpreads - 1)) * 100
    : 100;

  // ── Calculate section start positions ───────────────────────────────────
  const sectionMarkers = sections
    .map((section) => {
      const firstSpread = spreads.findIndex(
        (s) => s.sectionId === section.id,
      );
      if (firstSpread < 0) return null;
      return {
        section,
        spreadIndex: firstSpread,
        posPercent: (firstSpread / Math.max(totalSpreads - 1, 1)) * 100,
      };
    })
    .filter(Boolean) as Array<{
    section: MagazineSection;
    spreadIndex: number;
    posPercent: number;
  }>;

  // ── Pointer-based index calculation ─────────────────────────────────────
  const getIndexFromPointer = useCallback(
    (clientX: number): number => {
      if (!barRef.current) return currentSpread;
      const rect = barRef.current.getBoundingClientRect();
      // RTL: x=0 is right side (spread 0), x=width is left side (last spread)
      const relativeX = rect.right - clientX;
      const ratio = Math.max(0, Math.min(1, relativeX / rect.width));
      return Math.round(ratio * (totalSpreads - 1));
    },
    [currentSpread, totalSpreads],
  );

  // ── Click handler ────────────────────────────────────────────────────────
  const handleBarClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (dragRef.current) return; // prevent click after drag
      const index = getIndexFromPointer(e.clientX);
      onNavigate(index);
    },
    [getIndexFromPointer, onNavigate],
  );

  // ── Mouse hover ──────────────────────────────────────────────────────────
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const index = getIndexFromPointer(e.clientX);
      setHoverIndex(index);
      setTooltipX(e.clientX);

      if (dragRef.current && isDragging) {
        onNavigate(index);
      }
    },
    [getIndexFromPointer, isDragging, onNavigate],
  );

  // ── Drag scrubbing ───────────────────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = false;
      setIsDragging(true);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      dragRef.current = true;
      const index = getIndexFromPointer(e.clientX);
      onNavigate(index);
    },
    [isDragging, getIndexFromPointer, onNavigate],
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    // Reset drag flag after a tick so click doesn't also fire
    setTimeout(() => { dragRef.current = false; }, 10);
  }, []);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      dragRef.current = false;
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        insetInline: 0,
        zIndex: 35,
        height: isExpanded ? '24px' : '6px',
        transition: 'height 0.2s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => {
        setIsExpanded(false);
        setHoverIndex(null);
      }}
    >
      {/* Section labels — visible on expand */}
      {isExpanded && sectionMarkers.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            insetInline: 0,
            height: '24px',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          {sectionMarkers.map(({ section, posPercent }) => (
            <span
              key={section.id}
              style={{
                position: 'absolute',
                // RTL: posPercent from right
                right: `${posPercent}%`,
                bottom: 0,
                transform: 'translateX(50%)',
                color: section.themeColor || '#DDA853',
                fontSize: '0.6rem',
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                letterSpacing: '0.08em',
                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              }}
            >
              {section.name}
            </span>
          ))}
        </div>
      )}

      {/* Hover spread tooltip */}
      {isExpanded && hoverIndex !== null && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            bottom: '30px',
            left: tooltipX,
            transform: 'translateX(-50%)',
            background: 'rgba(24,59,78,0.95)',
            border: '1px solid rgba(221,168,83,0.3)',
            color: '#DDA853',
            padding: '3px 8px',
            fontSize: '0.7rem',
            fontFamily: 'var(--font-body)',
            fontVariantNumeric: 'tabular-nums',
            pointerEvents: 'none',
            borderRadius: '2px',
            whiteSpace: 'nowrap',
            zIndex: 36,
          }}
        >
          صفحة {hoverIndex + 1}
        </div>
      )}

      {/* Progress bar track */}
      <div
        ref={barRef}
        onClick={handleBarClick}
        onMouseMove={handleMouseMove}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          position: 'absolute',
          bottom: 0,
          insetInline: 0,
          height: '100%',
          background: 'rgba(255,255,255,0.08)',
          overflow: 'visible',
        }}
        role="slider"
        aria-label="تقدم القراءة"
        aria-valuemin={0}
        aria-valuemax={totalSpreads - 1}
        aria-valuenow={currentSpread}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') onNavigate(Math.min(currentSpread + 1, totalSpreads - 1));
          if (e.key === 'ArrowRight') onNavigate(Math.max(currentSpread - 1, 0));
        }}
      >
        {/* Gold fill */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            insetInlineEnd: 0,
            height: '100%',
            width: `${fillPercent}%`,
            background: '#DDA853',
            transition: isDragging ? 'none' : 'width 0.3s ease',
          }}
        />

        {/* Draggable indicator dot */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            // RTL: progress from right
            right: `${fillPercent}%`,
            transform: 'translate(50%, -50%)',
            width: isExpanded ? '14px' : '8px',
            height: isExpanded ? '14px' : '8px',
            borderRadius: '50%',
            background: '#DDA853',
            boxShadow: '0 0 8px rgba(221,168,83,0.6)',
            transition: isDragging ? 'none' : 'all 0.3s ease',
            cursor: 'grab',
            zIndex: 2,
          }}
          aria-hidden="true"
        />

        {/* Section tick marks */}
        {sectionMarkers.map(({ section, posPercent }) => (
          <div
            key={section.id}
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: `${posPercent}%`,
              width: '2px',
              background: section.themeColor || '#DDA853',
              opacity: 0.6,
              zIndex: 1,
            }}
          />
        ))}
      </div>
    </div>
  );
}
