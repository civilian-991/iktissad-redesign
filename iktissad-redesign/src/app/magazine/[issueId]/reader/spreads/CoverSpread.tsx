'use client';

import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import Image from 'next/image';
import type { MagazineIssue, MagazineSpread } from '@/types';
import { useTranslation } from '@/lib/i18n';

interface CoverSpreadProps {
  spread: MagazineSpread;
  issue: MagazineIssue;
}

export default function CoverSpread({ spread: _spread, issue }: CoverSpreadProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);

  const publishDate = issue.publishDate
    ? new Date(issue.publishDate).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', {
        year: 'numeric',
        month: 'long',
      })
    : '';

  // ── GSAP stagger reveal on mount ─────────────────────────────────────────
  useGSAP(
    () => {
      // Respect prefers-reduced-motion
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

      // Logo/badge: 0s delay
      if (logoRef.current) {
        tl.fromTo(logoRef.current, { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.5 }, 0);
      }
      // Title: 0.3s
      if (titleRef.current) {
        tl.fromTo(titleRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 }, 0.3);
      }
      // Subtitle: 0.6s
      if (subtitleRef.current) {
        tl.fromTo(subtitleRef.current, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5 }, 0.6);
      }
      // CTA: 0.9s
      if (ctaRef.current) {
        tl.fromTo(ctaRef.current, { opacity: 0, y: 10, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.4 }, 0.9);
      }
    },
    { scope: containerRef }
  );

  return (
    <div
      ref={containerRef}
      dir="rtl"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: '#183B4E',
      }}
    >
      {/* ── Full-bleed cover image ─────────────────────────────────────── */}
      {issue.coverImage ? (
        <div style={{ position: 'absolute', inset: 0 }}>
          <Image
            src={issue.coverImage}
            alt={issue.title}
            fill
            priority
            sizes="100vw"
            style={{ objectFit: 'cover', objectPosition: 'center top' }}
          />
          {/* Gradient overlay for text legibility */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(to top, rgba(24,59,78,0.95) 0%, rgba(24,59,78,0.4) 40%, rgba(24,59,78,0.1) 70%, transparent 100%)',
            }}
          />
        </div>
      ) : (
        /* Fallback background pattern */
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(135deg, #183B4E 0%, #27548A 50%, #183B4E 100%)',
          }}
        >
          {/* Decorative geometric pattern */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.06,
              backgroundImage:
                'repeating-linear-gradient(45deg, #DDA853 0, #DDA853 1px, transparent 0, transparent 50%)',
              backgroundSize: '20px 20px',
            }}
          />
        </div>
      )}

      {/* ── Issue number badge — top-right (RTL: inline-start) ───────────── */}
      <div
        ref={logoRef}
        style={{
          position: 'absolute',
          top: '24px',
          insetInlineStart: '24px',
          background: 'rgba(221,168,83,0.15)',
          border: '1px solid rgba(221,168,83,0.4)',
          borderRadius: '4px',
          padding: '6px 14px',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span
          style={{
            color: '#DDA853',
            fontSize: '12px',
            fontFamily: 'var(--font-arabic)',
            fontWeight: '600',
            letterSpacing: '0.05em',
          }}
        >
          {t('pages.magazine.cover.issueLabel').replace('{number}', String(issue.issueNumber ?? ''))}
        </span>
      </div>

      {/* ── Rive placeholder slot ─────────────────────────────────────────── */}
      {/* AnimatedCover is imported dynamically above (ssr:false) so the        */}
      {/* @rive-app/react-canvas runtime (~300KB) is code-split and deferred.  */}
      <div
        className="rive-placeholder"
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '20%',
          insetInlineEnd: '10%',
          width: '120px',
          height: '120px',
          opacity: 0,
        }}
      />

      {/* ── Bottom content area ───────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          insetInline: 0,
          padding: '40px 36px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}
      >
        {/* Magazine nameplate */}
        <h1
          ref={titleRef}
          style={{
            color: '#F5EEDC',
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
            fontFamily: 'var(--font-display)',
            fontWeight: '900',
            lineHeight: '1.1',
            margin: '0 0 8px',
            letterSpacing: '-0.02em',
            textShadow: '0 2px 20px rgba(0,0,0,0.5)',
          }}
        >
          {t('pages.magazine.cover.brand')}
        </h1>

        {/* Issue title */}
        {issue.title && (
          <p
            style={{
              color: '#DDA853',
              fontSize: 'clamp(1rem, 2.5vw, 1.5rem)',
              fontFamily: 'var(--font-arabic)',
              fontWeight: '600',
              margin: '0 0 4px',
            }}
          >
            {issue.title}
          </p>
        )}

        {/* Issue date */}
        <p
          ref={subtitleRef}
          style={{
            color: 'rgba(245,238,220,0.6)',
            fontSize: '14px',
            fontFamily: 'var(--font-arabic)',
            margin: '0 0 28px',
          }}
        >
          {publishDate}
        </p>

        {/* CTA */}
        <button
          ref={ctaRef}
          onClick={() => {
            // Dispatch a custom event that ReaderClient can listen to for navigation
            window.dispatchEvent(new CustomEvent('reader:navigate', { detail: { index: 2 } }));
          }}
          style={{
            background: '#DDA853',
            color: '#183B4E',
            border: 'none',
            borderRadius: '6px',
            padding: '12px 28px',
            fontSize: '15px',
            fontFamily: 'var(--font-arabic)',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
          }}
          onMouseOver={e => {
            (e.currentTarget as HTMLButtonElement).style.background = '#c99a3f';
          }}
          onMouseOut={e => {
            (e.currentTarget as HTMLButtonElement).style.background = '#DDA853';
          }}
        >
          {t('pages.magazine.cover.startReading')}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      {/* ── Highlights strip ─────────────────────────────────────────────── */}
      {issue.highlights?.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '24px',
            insetInlineEnd: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            maxWidth: '200px',
          }}
        >
          {issue.highlights.slice(0, 3).map((h, i) => (
            <div
              key={i}
              style={{
                color: 'rgba(245,238,220,0.75)',
                fontSize: '11px',
                fontFamily: 'var(--font-arabic)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '6px',
              }}
            >
              <span style={{ color: '#DDA853', flexShrink: 0 }}>◆</span>
              {h}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
