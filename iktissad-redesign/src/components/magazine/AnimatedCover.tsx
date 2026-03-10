'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { gsap } from 'gsap';
import { RivePlaceholder } from './RivePlaceholder';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AnimatedCoverProps {
  coverImageUrl: string;
  issueNumber: string;
  issueDate: string;
  title?: string;
  onStartReading?: () => void;
}

// ── Lazy-load Rive canvas component ──────────────────────────────────────────
// @rive-app/react-canvas is ~300KB — defer it so the cover renders immediately
// and Rive hydrates asynchronously after the initial paint.
const RiveCanvas = dynamic(
  () => import('./RiveCanvas'),
  {
    ssr: false,
    loading: () => <RivePlaceholder style={{ position: 'absolute', inset: 0 }} />,
  },
);

// ── Component ─────────────────────────────────────────────────────────────────

export default function AnimatedCover({
  coverImageUrl,
  issueNumber,
  issueDate,
  title = 'إقتصاد',
  onStartReading,
}: AnimatedCoverProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const riveLayerRef = useRef<HTMLDivElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);
  const dateRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const issueRef = useRef<HTMLSpanElement>(null);

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // ── Check prefers-reduced-motion ──────────────────────────────────────────
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ── GSAP entrance animation ───────────────────────────────────────────────
  useEffect(() => {
    if (prefersReducedMotion) return;
    if (
      !bgRef.current ||
      !nameRef.current ||
      !dateRef.current ||
      !ctaRef.current ||
      !issueRef.current
    ) return;

    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

    // t=0: fade in cover image
    tl.fromTo(bgRef.current, { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0);

    // t=0.3: scale in magazine name
    tl.fromTo(
      nameRef.current,
      { scale: 0.9, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.5 },
      0.3,
    );

    // t=0.3: fade in issue number
    tl.fromTo(issueRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.3);

    // t=0.6: slide up issue date
    tl.fromTo(
      dateRef.current,
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4 },
      0.6,
    );

    // t=0.8: fade in CTA
    tl.fromTo(ctaRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.8);

    return () => { tl.kill(); };
  }, [prefersReducedMotion]);

  // ── Mouse parallax ────────────────────────────────────────────────────────
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (prefersReducedMotion || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      // Normalize to -1 … +1
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;

      if (bgRef.current) {
        bgRef.current.style.transform = `translate(${x * 10}px, ${y * 10}px)`;
      }
      if (riveLayerRef.current) {
        riveLayerRef.current.style.transform = `translate(${x * 20}px, ${y * 20}px)`;
      }
      if (textLayerRef.current) {
        textLayerRef.current.style.transform = `translate(${x * 5}px, ${y * 5}px)`;
      }
    },
    [prefersReducedMotion],
  );

  const handleMouseLeave = useCallback(() => {
    if (bgRef.current) bgRef.current.style.transform = '';
    if (riveLayerRef.current) riveLayerRef.current.style.transform = '';
    if (textLayerRef.current) textLayerRef.current.style.transform = '';
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: '#183B4E',
      }}
      aria-label={`غلاف المجلة: ${title}`}
    >
      {/* ── Layer 1: Cover image ──────────────────────────────────────────── */}
      <div
        ref={bgRef}
        style={{
          position: 'absolute',
          inset: '-10px',
          transition: 'transform 0.1s ease-out',
          willChange: 'transform',
        }}
      >
        {coverImageUrl ? (
          <Image
            src={coverImageUrl}
            alt={`غلاف: ${title}`}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          /* Fallback background when no cover image */
          <div
            style={{
              width: '100%',
              height: '100%',
              background:
                'linear-gradient(160deg, #183B4E 0%, #0C1E2A 60%, #0a1820 100%)',
            }}
          />
        )}

        {/* Dark vignette overlay */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to top, rgba(12,30,42,0.85) 0%, rgba(12,30,42,0.3) 40%, rgba(12,30,42,0.1) 70%, transparent 100%)',
          }}
        />
      </div>

      {/* ── Layer 2: Rive animation slot (lazy-loaded) ────────────────────── */}
      <div
        ref={riveLayerRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          transition: 'transform 0.1s ease-out',
          willChange: 'transform',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      >
        {/* RiveCanvas is dynamically imported — Rive runtime deferred */}
        <RiveCanvas src="/animations/magazine-cover.riv" />

        {/* Additional gold gradient for decorative depth */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(135deg, rgba(221,168,83,0.1) 0%, transparent 60%)',
            animation: prefersReducedMotion ? 'none' : 'pulse 3s ease-in-out infinite',
          }}
        />
      </div>

      {/* ── Layer 3: Text overlay ─────────────────────────────────────────── */}
      <div
        ref={textLayerRef}
        dir="rtl"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3,
          transition: 'transform 0.1s ease-out',
          willChange: 'transform',
          padding: '2rem',
        }}
      >
        {/* Issue number — top inline-end */}
        <span
          ref={issueRef}
          style={{
            position: 'absolute',
            top: '1.5rem',
            insetInlineEnd: '1.5rem',
            color: '#DDA853',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            opacity: prefersReducedMotion ? 1 : 0,
          }}
        >
          العدد {issueNumber}
        </span>

        {/* Magazine name */}
        <h1
          ref={nameRef}
          style={{
            fontFamily: 'var(--font-accent)',
            fontSize: 'clamp(3rem, 8vw, 5rem)',
            fontWeight: 900,
            color: '#F5EEDC',
            lineHeight: 1,
            letterSpacing: '-0.02em',
            textAlign: 'center',
            marginBottom: '0.5rem',
            opacity: prefersReducedMotion ? 1 : 0,
            textShadow: '0 2px 20px rgba(0,0,0,0.4)',
          }}
        >
          {title}
        </h1>

        {/* Issue date */}
        <p
          ref={dateRef}
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.9rem',
            color: '#DDA853',
            letterSpacing: '0.08em',
            marginBottom: '2.5rem',
            opacity: prefersReducedMotion ? 1 : 0,
            textAlign: 'center',
          }}
        >
          {issueDate}
        </p>

        {/* Start reading CTA */}
        <button
          ref={ctaRef}
          onClick={onStartReading}
          className="btn-gold"
          style={{
            opacity: prefersReducedMotion ? 1 : 0,
            cursor: 'pointer',
          }}
          aria-label="ابدأ القراءة"
        >
          <span>ابدأ القراءة</span>
        </button>
      </div>
    </div>
  );
}
