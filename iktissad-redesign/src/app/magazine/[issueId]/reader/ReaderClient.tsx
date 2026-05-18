'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import useEmblaCarousel from 'embla-carousel-react';
import type { MagazineIssue, MagazineSpread, MagazineSection } from '@/types';
import { useTranslation } from '@/lib/i18n';
import GrainFilter from '@/components/magazine/GrainFilter';
import CoverSpread from './spreads/CoverSpread';
import TOCSpread from './spreads/TOCSpread';
import EditorialSpread from './spreads/EditorialSpread';
import ArticleSpread from './spreads/ArticleSpread';
import PhotoEssaySpread from './spreads/PhotoEssaySpread';
import AdvertSpread from './spreads/AdvertSpread';

// ── Types ────────────────────────────────────────────────────────────────────

interface ReaderClientProps {
  issue: MagazineIssue;
  spreads: MagazineSpread[];
  sections: MagazineSection[];
}

// ── Spread renderer — picks the right component by templateId ─────────────────

function SpreadRenderer({
  spread,
  index: _index,
  issue,
  sections,
  onNavigate,
}: {
  spread: MagazineSpread;
  index: number;
  issue: MagazineIssue;
  sections: MagazineSection[];
  onNavigate: (spreadIndex: number) => void;
}) {
  const templateId = spread.templateId;

  if (templateId === 'cover') {
    return <CoverSpread spread={spread} issue={issue} />;
  }
  if (templateId === 'toc') {
    return (
      <TOCSpread
        spread={spread}
        sections={sections}
        onNavigate={onNavigate}
      />
    );
  }
  if (templateId === 'photo-essay') {
    const zones = spread.zones as { images?: Array<{ src: string; alt: string; caption?: string }> };
    return <PhotoEssaySpread images={zones.images ?? []} />;
  }
  if (templateId === 'ad-full') {
    const zones = spread.zones as {
      image_url?: string;
      target_url?: string;
      alt_text?: string;
      adId?: string;
    };
    return (
      <AdvertSpread
        imageUrl={zones.image_url ?? ''}
        targetUrl={zones.target_url}
        altText={zones.alt_text}
        adId={zones.adId}
      />
    );
  }
  if (templateId === 'article') {
    const zones = spread.zones as { article?: Record<string, unknown> };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return <ArticleSpread article={zones.article as any} spread={spread} />;
  }

  // Default: editorial layout (hero-left, hero-right, hero-full, two-column, etc.)
  return <EditorialSpread spread={spread} sections={sections} />;
}

// ── Placeholder for virtualized (not-mounted) spreads ─────────────────────────

function SpreadPlaceholder() {
  return (
    <div
      className="w-full h-full"
      style={{ background: '#183B4E' }}
      aria-hidden="true"
    />
  );
}

// ── Main ReaderClient ─────────────────────────────────────────────────────────

export default function ReaderClient({ issue, spreads, sections }: ReaderClientProps) {
  const { t } = useTranslation();
  const [currentSpread, setCurrentSpread] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [pageAnnouncement, setPageAnnouncement] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);
  const prevSpreadRef = useRef(0);

  // ── Embla Carousel — RTL direction ────────────────────────────────────────
  const [emblaRef, emblaApi] = useEmblaCarousel({
    direction: 'rtl',
    loop: false,
    skipSnaps: false,
    align: 'center',
    dragFree: false,
  });

  // ── GSAP plugin registration ───────────────────────────────────────────────
  useGSAP(() => {
    // Register no plugins needed for basic rotateY
  }, []);

  // ── Page-flip overlay animation ───────────────────────────────────────────
  const triggerFlipAnimation = useCallback((direction: 'next' | 'prev') => {
    if (!overlayRef.current || isFlipping) return;
    setIsFlipping(true);

    // Skip animation for users who prefer reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsFlipping(false);
      return;
    }

    const overlay = overlayRef.current;
    const isNext = direction === 'next';

    // RTL: next = going right-to-left (flip from left edge of right page)
    // prev = going left-to-right (flip from right edge of left page)
    const transformOrigin = isNext ? 'left center' : 'right center';
    const startRotate = 0;
    const midRotate = isNext ? -90 : 90;

    gsap.set(overlay, {
      opacity: 1,
      rotateY: startRotate,
      transformOrigin,
      transformPerspective: 1200,
    });

    gsap
      .timeline({
        onComplete: () => {
          gsap.set(overlay, { opacity: 0 });
          setIsFlipping(false);
        },
      })
      .to(overlay, {
        rotateY: midRotate,
        duration: 0.35,
        ease: 'power2.in',
      })
      .set(overlay, { rotateY: isNext ? 90 : -90 })
      .to(overlay, {
        rotateY: 0,
        duration: 0.35,
        ease: 'power2.out',
      });
  }, [isFlipping]);

  // ── Embla event listeners ─────────────────────────────────────────────────
  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      const next = emblaApi.selectedScrollSnap();
      const prev = prevSpreadRef.current;
      if (next !== prev) {
        const direction = next > prev ? 'next' : 'prev';
        // In RTL Embla: scrollNext() goes left (which is "next page" in Arabic)
        triggerFlipAnimation(direction);
        prevSpreadRef.current = next;
        setCurrentSpread(next);
        // Announce page change to screen readers
        setPageAnnouncement(`الصفحة ${next + 1} من ${Math.max(spreads.length, 1)}`);
      }
    };

    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, triggerFlipAnimation, spreads.length]);

  // ── Keyboard navigation ───────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!emblaApi) return;
      if (e.key === 'ArrowLeft') {
        // In RTL: ArrowLeft = next spread (reading forward)
        emblaApi.scrollNext();
      } else if (e.key === 'ArrowRight') {
        // In RTL: ArrowRight = previous spread
        emblaApi.scrollPrev();
      } else if (e.key === 'Escape') {
        // Navigate back to magazine archive
        window.location.href = '/magazine';
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [emblaApi]);

  // ── Navigate to specific spread (from TOC) ────────────────────────────────
  const navigateToSpread = useCallback((index: number) => {
    if (!emblaApi) return;
    emblaApi.scrollTo(index);
  }, [emblaApi]);

  // ── Virtualization: mount only current ±2 spreads ────────────────────────
  const isSpreadMounted = useCallback((index: number) => {
    return Math.abs(index - currentSpread) <= 2;
  }, [currentSpread]);

  // ── Fallback: create a minimal cover spread if none exist ─────────────────
  const displaySpreads: MagazineSpread[] = spreads.length > 0
    ? spreads
    : [{
        id: 'cover-fallback',
        issueId: issue.id,
        sectionId: null,
        pageNumber: 0,
        templateId: 'cover',
        zones: {},
        metadata: {},
        updatedAt: '',
        updatedBy: null,
      }];

  return (
    <>
      {/* Hidden SVG grain filter (used via CSS filter url) */}
      <GrainFilter />

      {/* Screen reader skip link */}
      <a
        href="#article-text"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-gold focus:text-obsidian focus:rounded-lg focus:font-bold"
      >
        انتقل إلى نص المقالة
      </a>

      {/* Live region for page change announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {pageAnnouncement}
      </div>

      {/* Full-viewport reader shell */}
      <div
        role="main"
        dir="rtl"
        style={{
          position: 'fixed',
          inset: 0,
          background: '#0e2330',
          overflow: 'hidden',
          perspective: '1200px',
        }}
        aria-label={`قارئ المجلة: ${issue.title}`}
      >
        {/* Ambient background gradient */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at 50% 30%, rgba(27,58,78,0.9) 0%, rgba(14,35,48,1) 60%)',
            pointerEvents: 'none',
          }}
        />

        {/* ── Embla Carousel container ─────────────────────────────────── */}
        <div
          ref={emblaRef}
          style={{
            position: 'absolute',
            inset: 0,
            // Padding inline so adjacent spreads peek in at edges
            paddingInline: '60px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              // RTL: flex-direction is reversed automatically by direction attr
              height: '100%',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            {displaySpreads.map((spread, index) => {
              const isActive = isSpreadMounted(index);
              return (
              <div
                key={spread.id}
                data-active={isActive ? 'true' : 'false'}
                style={{
                  flex: '0 0 100%',
                  height: '90vh',
                  maxHeight: '800px',
                  position: 'relative',
                  // Paper elevation + physicality
                  boxShadow:
                    '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  // GPU-accelerated layer for smooth transforms during page flip
                  willChange: 'transform',
                  // Skip rendering off-screen spreads (>3 away from current)
                  // content-visibility: auto tells the browser to skip layout/paint
                  // for hidden slides (CSS containment performance optimization).
                  // Cast to any to use newer CSS properties not yet in React types.
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ...({ contentVisibility: isActive ? 'visible' : 'auto', containIntrinsicSize: '100vw 90vh' } as any),
                }}
              >
                {isActive ? (
                  <>
                    {/* Spread content */}
                    <SpreadRenderer
                      spread={spread}
                      index={index}
                      issue={issue}
                      sections={sections}
                      onNavigate={navigateToSpread}
                    />

                    {/* Paper grain overlay */}
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        filter: 'url(#paper-grain)',
                        opacity: 0.04,
                        pointerEvents: 'none',
                        zIndex: 10,
                        background: '#fff',
                        mixBlendMode: 'overlay',
                      }}
                    />

                    {/* Spine shadow — center gradient simulating book spine */}
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background:
                          'linear-gradient(to left, transparent 45%, rgba(0,0,0,0.3) 50%, transparent 55%)',
                        pointerEvents: 'none',
                        zIndex: 5,
                      }}
                    />
                  </>
                ) : (
                  <SpreadPlaceholder />
                )}
              </div>
              );
            })}
          </div>
        </div>

        {/* ── GSAP flip overlay ────────────────────────────────────────── */}
        <div
          ref={overlayRef}
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            background:
              'linear-gradient(135deg, rgba(245,238,220,0.15) 0%, rgba(245,238,220,0.05) 100%)',
            opacity: 0,
            pointerEvents: 'none',
            zIndex: 50,
            backfaceVisibility: 'hidden',
          }}
        />

        {/* ── Navigation arrows ────────────────────────────────────────── */}
        {/* RTL: Next spread = left arrow; Prev spread = right arrow */}
        <button
          onClick={() => emblaApi?.scrollNext()}
          disabled={!emblaApi || currentSpread >= displaySpreads.length - 1}
          aria-label="الصفحة التالية"
          style={{
            position: 'fixed',
            insetInlineStart: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 40,
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(221,168,83,0.2)',
            color: '#DDA853',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            opacity: currentSpread >= displaySpreads.length - 1 ? 0.3 : 1,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <button
          onClick={() => emblaApi?.scrollPrev()}
          disabled={!emblaApi || currentSpread <= 0}
          aria-label="الصفحة السابقة"
          style={{
            position: 'fixed',
            insetInlineEnd: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 40,
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(221,168,83,0.2)',
            color: '#DDA853',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            opacity: currentSpread <= 0 ? 0.3 : 1,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* ── Minimal top bar ──────────────────────────────────────────── */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            insetInline: 0,
            zIndex: 40,
            height: '52px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingInline: '20px',
            background:
              'linear-gradient(to bottom, rgba(14,35,48,0.9) 0%, transparent 100%)',
          }}
        >
          <Link
            href="/magazine"
            style={{
              color: 'rgba(245,238,220,0.6)',
              textDecoration: 'none',
              fontSize: '13px',
              fontFamily: 'var(--font-arabic)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            {t('pages.magazine.allIssuesLink')}
          </Link>

          <span
            style={{
              color: 'rgba(245,238,220,0.8)',
              fontSize: '14px',
              fontFamily: 'var(--font-arabic)',
              fontWeight: '600',
            }}
          >
            {issue.title}
          </span>

          <span
            style={{
              color: '#DDA853',
              fontSize: '12px',
              fontFamily: 'var(--font-arabic)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {currentSpread + 1} / {displaySpreads.length}
          </span>
        </div>

        {/* ── Bottom progress bar ──────────────────────────────────────── */}
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            insetInline: 0,
            zIndex: 40,
            height: '3px',
            background: 'rgba(255,255,255,0.08)',
          }}
        >
          <div
            style={{
              height: '100%',
              background: '#DDA853',
              width: `${((currentSpread + 1) / Math.max(displaySpreads.length, 1)) * 100}%`,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>
    </>
  );
}
