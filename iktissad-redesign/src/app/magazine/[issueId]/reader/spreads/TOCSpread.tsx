'use client';

import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import type { MagazineSpread, MagazineSection } from '@/types';
import { useTranslation } from '@/lib/i18n';

interface TOCEntry {
  title: string;
  spreadIndex: number;
  sectionName?: string;
  pageNumber?: number;
}

interface TOCSpreadProps {
  spread: MagazineSpread;
  sections: MagazineSection[];
  onNavigate: (spreadIndex: number) => void;
}

export default function TOCSpread({ spread, sections, onNavigate }: TOCSpreadProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);

  // Extract TOC entries from spread zones
  const zones = spread.zones as {
    entries?: TOCEntry[];
    articles?: Array<{
      title: string;
      spreadIndex: number;
      pageNumber?: number;
      section?: string;
    }>;
  };

  // Build TOC from zones.entries or zones.articles
  const entries: TOCEntry[] = zones.entries ?? zones.articles ?? [];

  // Group entries by section
  const grouped: Record<string, TOCEntry[]> = {};
  for (const entry of entries) {
    const sectionKey = entry.sectionName ?? t('pages.magazine.toc.general');
    if (!grouped[sectionKey]) grouped[sectionKey] = [];
    grouped[sectionKey].push(entry);
  }

  // If no entries in zones, show sections as top-level items
  const hasEntries = entries.length > 0;

  // ── GSAP stagger reveal ──────────────────────────────────────────────────
  useGSAP(
    () => {
      if (!itemsRef.current) return;
      // Respect prefers-reduced-motion
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const items = itemsRef.current.querySelectorAll('[data-toc-item]');
      gsap.fromTo(
        items,
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.05,
          ease: 'power2.out',
          delay: 0.2,
        }
      );
    },
    { scope: containerRef, dependencies: [entries.length] }
  );

  return (
    <div
      ref={containerRef}
      dir="rtl"
      style={{
        width: '100%',
        height: '100%',
        background: '#F5EEDC',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        overflow: 'hidden',
      }}
    >
      {/* ── Right column: TOC list (RTL primary side) ────────────────────── */}
      <div
        style={{
          padding: '48px 40px',
          borderInlineEnd: '1px solid rgba(24,59,78,0.1)',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Heading */}
        <h2
          style={{
            color: '#DDA853',
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            fontFamily: 'var(--font-arabic)',
            fontWeight: '800',
            margin: '0 0 40px',
            lineHeight: '1.2',
          }}
        >
          {t('pages.magazine.toc.title')}
        </h2>

        <div ref={itemsRef}>
          {hasEntries ? (
            /* Grouped by section */
            Object.entries(grouped).map(([sectionName, sectionEntries], sIdx) => (
              <div key={sectionName} style={{ marginBottom: '32px' }}>
                {/* Section header */}
                <div
                  data-toc-item
                  style={{
                    color: '#27548A',
                    fontSize: '11px',
                    fontFamily: 'var(--font-arabic)',
                    fontWeight: '700',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: '12px',
                    paddingBottom: '8px',
                    borderBottom: '2px solid #DDA853',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#DDA853',
                      flexShrink: 0,
                    }}
                  />
                  {sectionName}
                </div>

                {/* Articles in section */}
                {sectionEntries.map((entry, eIdx) => (
                  <button
                    key={`${sIdx}-${eIdx}`}
                    data-toc-item
                    onClick={() => onNavigate(entry.spreadIndex)}
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '8px 0',
                      textAlign: 'right',
                      gap: '12px',
                      borderBottom: '1px solid rgba(24,59,78,0.06)',
                      transition: 'all 0.15s',
                    }}
                    onMouseOver={e => {
                      const btn = e.currentTarget;
                      btn.style.background = 'rgba(221,168,83,0.08)';
                      btn.style.borderRadius = '4px';
                    }}
                    onMouseOut={e => {
                      const btn = e.currentTarget;
                      btn.style.background = 'none';
                      btn.style.borderRadius = '0';
                    }}
                    title={t('pages.magazine.toc.clickToJump')}
                  >
                    <span
                      style={{
                        color: '#183B4E',
                        fontSize: '14px',
                        fontFamily: 'var(--font-arabic)',
                        lineHeight: '1.5',
                        flexGrow: 1,
                        textAlign: 'right',
                      }}
                    >
                      {entry.title}
                    </span>
                    {/* Page number — gold, end-aligned */}
                    {entry.pageNumber != null && (
                      <span
                        style={{
                          color: '#DDA853',
                          fontSize: '12px',
                          fontFamily: 'var(--font-arabic)',
                          fontWeight: '700',
                          flexShrink: 0,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {entry.pageNumber}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))
          ) : sections.length > 0 ? (
            /* Fallback: show sections if no article entries */
            sections.map((section, idx) => (
              <div
                key={section.id}
                data-toc-item
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 0',
                  borderBottom: '1px solid rgba(24,59,78,0.08)',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: section.themeColor ?? '#DDA853',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    color: '#183B4E',
                    fontSize: '16px',
                    fontFamily: 'var(--font-arabic)',
                    fontWeight: '600',
                    flexGrow: 1,
                  }}
                >
                  {section.name}
                </span>
                <span
                  style={{
                    color: '#DDA853',
                    fontSize: '13px',
                    fontFamily: 'var(--font-arabic)',
                    fontWeight: '700',
                    flexShrink: 0,
                  }}
                >
                  {idx + 2}
                </span>
              </div>
            ))
          ) : (
            /* Empty state */
            <p
              style={{
                color: 'rgba(24,59,78,0.4)',
                fontFamily: 'var(--font-arabic)',
                fontSize: '14px',
                textAlign: 'center',
                marginTop: '40px',
              }}
            >
              {t('pages.magazine.toc.noArticles')}
            </p>
          )}
        </div>
      </div>

      {/* ── Left column: decorative (RTL secondary side) ──────────────────── */}
      <div
        style={{
          background: '#183B4E',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          padding: '48px 32px',
        }}
      >
        {/* Geometric decorative background */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.05,
            backgroundImage:
              'repeating-linear-gradient(-45deg, #DDA853 0, #DDA853 1px, transparent 0, transparent 50%)',
            backgroundSize: '16px 16px',
          }}
        />

        {/* Large ornamental quote mark */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '20%',
            color: 'rgba(221,168,83,0.08)',
            fontSize: '18rem',
            fontFamily: 'var(--font-display)',
            lineHeight: '1',
            userSelect: 'none',
          }}
        >
          «
        </div>

        {/* Magazine branding */}
        <div style={{ position: 'relative', textAlign: 'center' }}>
          <p
            style={{
              color: '#DDA853',
              fontSize: '11px',
              fontFamily: 'var(--font-arabic)',
              letterSpacing: '0.12em',
              marginBottom: '12px',
              opacity: 0.8,
            }}
          >
            {t('pages.magazine.cover.magazineLabel')}
          </p>
          <h3
            style={{
              color: '#F5EEDC',
              fontSize: 'clamp(2rem, 4vw, 3.5rem)',
              fontFamily: 'var(--font-display)',
              fontWeight: '900',
              margin: '0 0 12px',
              letterSpacing: '-0.02em',
            }}
          >
            {t('pages.magazine.cover.brand')}
          </h3>
          <div
            style={{
              width: '60px',
              height: '2px',
              background: '#DDA853',
              margin: '0 auto 16px',
            }}
          />
          <p
            style={{
              color: 'rgba(245,238,220,0.5)',
              fontSize: '12px',
              fontFamily: 'var(--font-arabic)',
            }}
          >
            {t('common.brand.name')}
          </p>
        </div>

        {/* Section color swatches */}
        {sections.length > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              display: 'flex',
              gap: '8px',
            }}
          >
            {sections.slice(0, 6).map(s => (
              <div
                key={s.id}
                style={{
                  width: '24px',
                  height: '4px',
                  borderRadius: '2px',
                  background: s.themeColor ?? '#DDA853',
                  opacity: 0.8,
                }}
                title={s.name}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
