'use client';

import { useEffect, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import type { MagazineSection, MagazineSpread } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TOCPanelProps {
  sections: MagazineSection[];
  spreads: MagazineSpread[];
  currentSpread: number;
  onNavigate: (spreadIndex: number) => void;
  isOpen: boolean;
  onClose: () => void;
  readProgress: number; // 0-100
}

// ── Reading progress ring ─────────────────────────────────────────────────────

function ProgressRing({ progress }: { progress: number }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 44 44"
      style={{ transform: 'rotate(-90deg)' }}
      aria-label={`تقدم القراءة: ${Math.round(progress)}٪`}
    >
      {/* Track */}
      <circle
        cx="22"
        cy="22"
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="3"
      />
      {/* Progress */}
      <circle
        cx="22"
        cy="22"
        r={radius}
        fill="none"
        stroke="#DDA853"
        strokeWidth="3"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
      {/* Percentage text — counter-rotate so it reads normally */}
      <text
        x="22"
        y="22"
        textAnchor="middle"
        dominantBaseline="central"
        style={{
          transform: 'rotate(90deg)',
          transformOrigin: '22px 22px',
          fill: '#DDA853',
          fontSize: '8px',
          fontFamily: 'var(--font-body)',
          fontWeight: 700,
        }}
      >
        {Math.round(progress)}٪
      </text>
    </svg>
  );
}

// ── Main TOCPanel ─────────────────────────────────────────────────────────────

export default function TOCPanel({
  sections,
  spreads,
  currentSpread,
  onNavigate,
  isOpen,
  onClose,
  readProgress,
}: TOCPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const prefersReducedMotionRef = useRef(false);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // ── Detect prefers-reduced-motion ────────────────────────────────────────
  useEffect(() => {
    prefersReducedMotionRef.current = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
  }, []);

  // ── GSAP stagger on open ──────────────────────────────────────────────────
  useEffect(() => {
    if (!listRef.current || prefersReducedMotionRef.current) return;
    const items = listRef.current.querySelectorAll('[data-toc-item]');
    if (!items.length) return;

    if (isOpen) {
      gsap.fromTo(
        items,
        { y: 15, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.4,
          stagger: 0.03,
          ease: 'power2.out',
          delay: 0.15, // after panel slides in
        },
      );
    } else {
      gsap.set(items, { y: 15, opacity: 0 });
    }
  }, [isOpen]);

  // ── Focus trap + keyboard handling ───────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    // Focus first focusable element on open
    firstFocusableRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Tab trap
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const focusableArr = Array.from(focusable);
        const first = focusableArr[0];
        const last = focusableArr[focusableArr.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // ── Get spreads per section ───────────────────────────────────────────────
  const getSpreadsBySection = useCallback(
    (sectionId: string) => {
      return spreads
        .map((s, index) => ({ spread: s, index }))
        .filter(({ spread }) => spread.sectionId === sectionId);
    },
    [spreads],
  );

  // Spreads with no section (cover, toc, ads, etc.)
  const unassignedSpreads = spreads
    .map((s, index) => ({ spread: s, index }))
    .filter(({ spread }) => !spread.sectionId);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          aria-hidden="true"
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(12,30,42,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 39,
          }}
        />
      )}

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="جدول المحتويات"
        dir="rtl"
        className={`toc-panel${isOpen ? '' : ' closed'}`}
        style={{
          position: 'fixed',
          top: 0,
          insetInlineEnd: 0,
          height: '100dvh',
          width: 'min(380px, 100vw)',
          background: '#183B4E',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.4)',
          borderInlineStart: '1px solid rgba(221,168,83,0.15)',
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(221,168,83,0.12)',
            flexShrink: 0,
          }}
        >
          {/* Close button */}
          <button
            ref={firstFocusableRef}
            onClick={onClose}
            aria-label="أغلق جدول المحتويات"
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(245,238,220,0.5)',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s',
              borderRadius: '2px',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#DDA853';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color =
                'rgba(245,238,220,0.5)';
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Title */}
          <h2
            style={{
              fontFamily: 'var(--font-accent)',
              color: '#DDA853',
              fontSize: '1.1rem',
              fontWeight: 700,
              letterSpacing: '0.02em',
              margin: 0,
            }}
          >
            المحتويات
          </h2>

          {/* Reading progress ring */}
          <ProgressRing progress={readProgress} />
        </div>

        {/* ── Scrollable content ──────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem 0',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(221,168,83,0.2) transparent',
          }}
        >
          <ul
            ref={listRef}
            style={{ listStyle: 'none', margin: 0, padding: 0 }}
          >
            {/* Unassigned spreads (cover, TOC, etc.) */}
            {unassignedSpreads.length > 0 && (
              <>
                {unassignedSpreads.map(({ spread, index }) => (
                  <li key={spread.id} data-toc-item style={{ opacity: 0 }}>
                    <button
                      onClick={() => { onNavigate(index); onClose(); }}
                      style={{
                        width: '100%',
                        background: currentSpread === index
                          ? 'rgba(221,168,83,0.06)'
                          : 'transparent',
                        border: 'none',
                        padding: '0.65rem 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        textAlign: 'right',
                        direction: 'rtl',
                        borderInlineStart: currentSpread === index
                          ? '3px solid #DDA853'
                          : '3px solid transparent',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget;
                        el.style.borderInlineStartColor = '#DDA853';
                        el.style.background = 'rgba(221,168,83,0.06)';
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget;
                        if (currentSpread !== index) {
                          el.style.borderInlineStartColor = 'transparent';
                          el.style.background = 'transparent';
                        }
                      }}
                    >
                      <span
                        style={{
                          color:
                            currentSpread === index
                              ? '#DDA853'
                              : 'rgba(245,238,220,0.7)',
                          fontSize: '0.85rem',
                          fontFamily: 'var(--font-body)',
                          fontWeight: currentSpread === index ? 700 : 400,
                        }}
                      >
                        {spread.templateId === 'cover'
                          ? 'الغلاف'
                          : spread.templateId === 'toc'
                            ? 'فهرس المحتويات'
                            : `صفحة ${spread.pageNumber + 1}`}
                      </span>
                      <span
                        style={{
                          color: '#DDA853',
                          fontSize: '0.75rem',
                          fontFamily: 'var(--font-body)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {index + 1}
                      </span>
                    </button>
                  </li>
                ))}
              </>
            )}

            {/* Sections */}
            {sections.map((section) => {
              const sectionSpreads = getSpreadsBySection(section.id);
              return (
                <li key={section.id} data-toc-item style={{ opacity: 0 }}>
                  {/* Section header */}
                  <div
                    style={{
                      padding: '0.9rem 1.5rem 0.4rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    {/* Color swatch */}
                    <span
                      aria-hidden="true"
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: section.themeColor || '#DDA853',
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        color: section.themeColor || '#DDA853',
                        fontSize: '0.65rem',
                        fontFamily: 'var(--font-body)',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.15em',
                      }}
                    >
                      {section.name}
                    </span>
                  </div>

                  {/* Articles in this section */}
                  {sectionSpreads.length > 0 ? (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {sectionSpreads.map(({ spread, index }) => {
                        const zones = spread.zones as {
                          article?: { title?: string; titleEn?: string };
                          headline?: string;
                        };
                        const title =
                          zones?.article?.title ||
                          zones?.headline ||
                          `الصفحة ${spread.pageNumber + 1}`;
                        const isCurrent = currentSpread === index;

                        return (
                          <li key={spread.id}>
                            <button
                              onClick={() => { onNavigate(index); onClose(); }}
                              style={{
                                width: '100%',
                                background: isCurrent
                                  ? 'rgba(221,168,83,0.06)'
                                  : 'transparent',
                                border: 'none',
                                padding: '0.6rem 1.5rem 0.6rem 2rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '1rem',
                                cursor: 'pointer',
                                textAlign: 'right',
                                direction: 'rtl',
                                borderInlineStart: isCurrent
                                  ? '3px solid #DDA853'
                                  : '3px solid transparent',
                                transition: 'all 0.15s',
                              }}
                              onMouseEnter={(e) => {
                                const el = e.currentTarget;
                                el.style.borderInlineStartColor = '#DDA853';
                                el.style.background = 'rgba(221,168,83,0.06)';
                              }}
                              onMouseLeave={(e) => {
                                const el = e.currentTarget;
                                if (!isCurrent) {
                                  el.style.borderInlineStartColor =
                                    'transparent';
                                  el.style.background = 'transparent';
                                }
                              }}
                            >
                              <span
                                style={{
                                  color: isCurrent
                                    ? '#F5EEDC'
                                    : 'rgba(245,238,220,0.65)',
                                  fontSize: '0.85rem',
                                  fontFamily: 'var(--font-body)',
                                  fontWeight: isCurrent ? 700 : 400,
                                  lineHeight: 1.4,
                                  flex: 1,
                                  textAlign: 'right',
                                }}
                              >
                                {/* Current indicator dot */}
                                {isCurrent && (
                                  <span
                                    aria-hidden="true"
                                    style={{
                                      display: 'inline-block',
                                      width: '5px',
                                      height: '5px',
                                      borderRadius: '50%',
                                      background: '#DDA853',
                                      marginInlineEnd: '0.4rem',
                                      verticalAlign: 'middle',
                                    }}
                                  />
                                )}
                                {title}
                              </span>
                              <span
                                style={{
                                  color: '#DDA853',
                                  fontSize: '0.75rem',
                                  fontFamily: 'var(--font-body)',
                                  fontVariantNumeric: 'tabular-nums',
                                  flexShrink: 0,
                                }}
                              >
                                {index + 1}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p
                      style={{
                        color: 'rgba(245,238,220,0.3)',
                        fontSize: '0.8rem',
                        fontFamily: 'var(--font-body)',
                        padding: '0.4rem 2rem',
                        margin: 0,
                      }}
                    >
                      لا توجد مقالات
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
}
