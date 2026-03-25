'use client';

import React, { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Maximize2, Minimize2, Download, Grid3X3, X,
  Home, Loader2, BookOpen, Lock,
} from 'lucide-react';
import Link from 'next/link';
import type { MagazineIssue } from '@/types';
import PaywallModal from '@/components/magazine/PaywallModal';

// Pages 1–N are free; page N+1 onwards triggers paywall (0-indexed: index >= FREE_PAGES)
const FREE_PAGES = 3;

// ─── Page component (must forwardRef for react-pageflip) ──────────────────────

interface PageProps {
  url: string;
  num: number;
  locked?: boolean;
}

const MagazinePage = forwardRef<HTMLDivElement, PageProps>(({ url, num, locked }, ref) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      ref={ref}
      className="relative overflow-hidden bg-[#f5f0e8] select-none"
      style={{ width: '100%', height: '100%' }}
    >
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#f0ebe0]">
          <Loader2 size={20} className="text-stone-400 animate-spin" />
        </div>
      )}
      <img
        src={url}
        alt={`صفحة ${num}`}
        className={`w-full h-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        draggable={false}
        onLoad={() => setLoaded(true)}
      />
      {/* Inner edge shadow */}
      <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/25 to-transparent pointer-events-none" />
      {/* Page number */}
      <div className="absolute bottom-3 right-3 text-stone-500/70 text-[10px] font-mono">{num}</div>

      {/* Lock overlay for paywalled pages */}
      {locked && (
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black/85 flex flex-col items-center justify-end pb-8 gap-2">
          <Lock size={22} className="text-gold" />
          <p className="text-white/70 text-xs font-[family-name:var(--font-display)] text-center px-4">
            اشترك للوصول الكامل
          </p>
        </div>
      )}
    </div>
  );
});
MagazinePage.displayName = 'MagazinePage';

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  issue: MagazineIssue;
  isSubscriber: boolean;
  isLoggedIn: boolean;
}

export default function MagazineBrowsePageClient({ issue, isSubscriber }: Props) {
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbs, setShowThumbs] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [HTMLFlipBook, setHTMLFlipBook] = useState<any>(null);
  const uiTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const flipBookRef = useRef<any>(null);

  const pages = issue.pagesImages;
  const total = pages.length;

  // Lazy-import react-pageflip (not SSR-safe)
  useEffect(() => {
    import('react-pageflip').then(m => setHTMLFlipBook(() => m.default));
  }, []);

  // Preload current spread + 2 spreads ahead
  useEffect(() => {
    if (!pages.length) return;
    [currentPage + 2, currentPage + 3, currentPage + 4, currentPage + 5]
      .filter(i => i < total && (isSubscriber || i < FREE_PAGES))
      .forEach(i => {
        const img = new window.Image();
        img.src = pages[i];
      });
  }, [currentPage, pages, total, isSubscriber]);

  // Auto-hide UI on idle
  const kickUiTimer = useCallback(() => {
    setShowUI(true);
    clearTimeout(uiTimerRef.current);
    uiTimerRef.current = setTimeout(() => setShowUI(false), 4000);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', kickUiTimer);
    window.addEventListener('touchstart', kickUiTimer);
    kickUiTimer();
    return () => {
      window.removeEventListener('mousemove', kickUiTimer);
      window.removeEventListener('touchstart', kickUiTimer);
      clearTimeout(uiTimerRef.current);
    };
  }, [kickUiTimer]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const book = flipBookRef.current?.pageFlip?.();
      if (e.key === 'ArrowLeft') book?.flipNext();
      if (e.key === 'ArrowRight') book?.flipPrev();
      if (e.key === 'Escape') { setShowThumbs(false); if (isFullscreen) toggleFs(); }
      if (e.key === 'f') toggleFs();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullscreen]);

  function toggleFs() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }

  // Paywall intercept on page flip
  function handleFlip(e: any) {
    const newPage: number = e.data;
    if (!isSubscriber && newPage >= FREE_PAGES) {
      // Snap back to last free page
      setTimeout(() => {
        flipBookRef.current?.pageFlip?.()?.flip(FREE_PAGES - 1);
      }, 50);
      setPaywallOpen(true);
      return;
    }
    setCurrentPage(newPage);
  }

  // Responsive page size
  const [dims, setDims] = useState({ w: 460, h: 650 });
  useEffect(() => {
    function calc() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.round(Math.min(vw / 2.2, 520) * zoom);
      const h = Math.round(Math.min(vh * 0.82, w * 1.42) * zoom);
      setDims({ w, h });
    }
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, [zoom]);

  const readingProgress = total > 0 ? ((currentPage + 1) / total) * 100 : 0;

  // ── Not ready: issue pages not converted yet ───────────────────────────────

  if (!issue.pagesReady) {
    return (
      <div className="min-h-screen bg-[#1a1008] flex flex-col items-center justify-center gap-8 p-8">
        {issue.coverImage && (
          <div className="relative">
            <div className="absolute inset-0 bg-amber-600/20 blur-3xl rounded-full scale-110" />
            <img
              src={issue.coverImage}
              alt={issue.title}
              className="relative h-80 shadow-2xl shadow-black/80 rounded-sm"
            />
          </div>
        )}
        <div className="text-center space-y-3">
          <h1 className="text-white font-[family-name:var(--font-display)] font-bold text-xl">
            {issue.title}
          </h1>
          <p className="text-white/40 font-[family-name:var(--font-display)]">
            هذا العدد قيد التحضير
          </p>
          {issue.pdfUrl && (
            <a
              href={`/api/pdf-proxy?url=${encodeURIComponent(issue.pdfUrl)}`}
              className="inline-block mt-2 text-gold hover:text-gold-light font-[family-name:var(--font-display)] text-sm underline transition-colors"
            >
              قراءة بالتنسيق القديم (PDF)
            </a>
          )}
        </div>
        <Link
          href="/magazine"
          className="text-white/40 hover:text-gold font-[family-name:var(--font-display)] transition-colors"
        >
          ← العودة إلى قائمة الأعداد
        </Link>
      </div>
    );
  }

  // ── No pages array ─────────────────────────────────────────────────────────

  if (!pages.length) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center gap-4 text-center p-8">
        <BookOpen size={48} className="text-gold/30" />
        <p className="text-white/50 font-[family-name:var(--font-display)] text-lg">ملف المجلة غير متاح</p>
        <Link href="/magazine" className="text-gold hover:underline font-[family-name:var(--font-display)]">
          العودة إلى الأعداد
        </Link>
      </div>
    );
  }

  // ── Main reader ────────────────────────────────────────────────────────────

  return (
    <div
      className="h-screen overflow-hidden flex flex-col"
      style={{ background: 'radial-gradient(ellipse at center top, #2c1a0a 0%, #120a04 60%, #0a0603 100%)' }}
      dir="ltr"
    >
      {/* ── Loading overlay (while react-pageflip hydrates) ─────────────────── */}
      <AnimatePresence>
        {!HTMLFlipBook && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.5 } }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8"
            style={{ background: 'radial-gradient(ellipse at center, #2c1a0a 0%, #0a0603 100%)' }}
          >
            {issue.coverImage && (
              <div className="absolute w-64 h-96 bg-amber-600/20 blur-3xl rounded-full" />
            )}
            {issue.coverImage ? (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="relative"
              >
                <div className="absolute -inset-1 bg-black/50 blur-lg rounded-sm translate-y-4 translate-x-2" />
                <img
                  src={issue.coverImage}
                  alt={issue.title}
                  className="relative h-80 md:h-96 shadow-2xl shadow-black rounded-sm"
                  style={{ filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.9))' }}
                />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-56 h-80 bg-stone-800 rounded-sm flex items-center justify-center shadow-2xl"
              >
                <BookOpen size={48} className="text-gold/40" />
              </motion.div>
            )}
            <div className="text-center space-y-4">
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-white font-[family-name:var(--font-display)] font-bold text-xl"
              >
                {issue.title}
              </motion.h2>
              <div className="w-56 h-0.5 bg-white/10 rounded-full overflow-hidden mx-auto">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-700 to-gold rounded-full"
                  initial={{ width: '10%' }}
                  animate={{ width: '85%' }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                />
              </div>
              <p className="text-white/30 text-sm font-[family-name:var(--font-display)]">
                جاري التحضير...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top bar ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showUI && (
          <motion.header
            initial={{ y: -70, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -70, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed top-0 inset-x-0 z-40 h-14 flex items-center px-4 md:px-8 gap-3"
            style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)' }}
          >
            <Link
              href="/magazine"
              className="p-2 text-white/60 hover:text-gold rounded-lg hover:bg-white/5 transition-all"
              title="الأعداد"
            >
              <Home size={18} />
            </Link>

            <div className="flex-1 text-center hidden md:block">
              <span className="text-white/80 font-[family-name:var(--font-display)] font-semibold text-sm">
                {issue.title}
              </span>
              {total > 0 && (
                <span className="text-white/30 text-xs mr-2">
                  {currentPage + 1}
                  {currentPage + 1 < total ? `–${Math.min(currentPage + 2, total)}` : ''} / {total}
                </span>
              )}
            </div>

            <div className="flex items-center gap-0.5 mr-auto md:mr-0">
              <button
                onClick={() => setZoom(z => Math.min(1.5, parseFloat((z + 0.1).toFixed(1))))}
                className="p-2 text-white/50 hover:text-gold rounded-lg hover:bg-white/5 transition-all"
                title="تكبير"
              >
                <ZoomIn size={17} />
              </button>
              <button
                onClick={() => setZoom(z => Math.max(0.5, parseFloat((z - 0.1).toFixed(1))))}
                className="p-2 text-white/50 hover:text-gold rounded-lg hover:bg-white/5 transition-all"
                title="تصغير"
              >
                <ZoomOut size={17} />
              </button>
              <button
                onClick={() => setShowThumbs(v => !v)}
                className="p-2 text-white/50 hover:text-gold rounded-lg hover:bg-white/5 transition-all"
                title="جدول المحتويات"
              >
                <Grid3X3 size={17} />
              </button>
              <button
                onClick={toggleFs}
                className="p-2 text-white/50 hover:text-gold rounded-lg hover:bg-white/5 transition-all"
                title="ملء الشاشة"
              >
                {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
              </button>
              {isSubscriber && issue.pdfUrl && (
                <a
                  href={issue.pdfUrl}
                  download
                  className="p-2 text-white/50 hover:text-gold rounded-lg hover:bg-white/5 transition-all"
                  title="تحميل PDF"
                >
                  <Download size={17} />
                </a>
              )}
              {!isSubscriber && (
                <button
                  onClick={() => setPaywallOpen(true)}
                  className="px-3 py-1.5 text-xs font-[family-name:var(--font-display)] font-semibold text-stone-900 bg-gold hover:brightness-110 rounded transition-all mr-1"
                >
                  اشترك
                </button>
              )}
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* ── Main book area ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center relative">
        <div
          className="absolute bottom-0 inset-x-0 pointer-events-none"
          style={{
            height: '180px',
            background: 'radial-gradient(ellipse at center bottom, rgba(180,100,20,0.12) 0%, transparent 70%)',
          }}
        />

        {/* Prev spread */}
        <motion.button
          whileHover={{ scale: 1.1, x: 4 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => flipBookRef.current?.pageFlip?.()?.flipPrev()}
          className="absolute right-3 md:right-6 z-30 w-10 h-10 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm text-white/50 hover:text-gold hover:bg-black/50 transition-colors"
        >
          <ChevronRight size={22} />
        </motion.button>

        {/* Next spread */}
        <motion.button
          whileHover={{ scale: 1.1, x: -4 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => flipBookRef.current?.pageFlip?.()?.flipNext()}
          className="absolute left-3 md:left-6 z-30 w-10 h-10 flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm text-white/50 hover:text-gold hover:bg-black/50 transition-colors"
        >
          <ChevronLeft size={22} />
        </motion.button>

        {/* The image flipbook */}
        {HTMLFlipBook && pages.length > 0 && (
          <HTMLFlipBook
            ref={flipBookRef}
            width={dims.w}
            height={dims.h}
            size="fixed"
            minWidth={180}
            maxWidth={600}
            minHeight={260}
            maxHeight={900}
            drawShadow={true}
            flippingTime={750}
            usePortrait={true}
            startZIndex={20}
            autoSize={false}
            maxShadowOpacity={0.7}
            showCover={true}
            mobileScrollSupport={false}
            clickEventForward={true}
            useMouseEvents={true}
            swipeDistance={25}
            showPageCorners={true}
            disableFlipByClick={false}
            style={{
              filter: 'drop-shadow(0 40px 80px rgba(0,0,0,0.9)) drop-shadow(0 10px 30px rgba(0,0,0,0.7))',
            }}
            startPage={0}
            onFlip={handleFlip}
          >
            {pages.map((url, i) => (
              <MagazinePage
                key={i}
                url={url}
                num={i + 1}
                locked={!isSubscriber && i >= FREE_PAGES}
              />
            ))}
          </HTMLFlipBook>
        )}
      </div>

      {/* ── Bottom progress scrubber ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showUI && total > 0 && (
          <motion.footer
            initial={{ y: 48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 48, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-0 inset-x-0 z-40 h-10 flex items-center gap-3 px-6"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)' }}
          >
            <span className="text-white/30 text-[11px] font-mono w-6 text-right tabular-nums">
              {currentPage + 1}
            </span>
            <div
              className="flex-1 h-px bg-white/10 relative cursor-pointer group"
              onClick={e => {
                const r = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - r.left) / r.width;
                const target = Math.round(ratio * (total - 1));
                if (!isSubscriber && target >= FREE_PAGES) {
                  setPaywallOpen(true);
                  return;
                }
                flipBookRef.current?.pageFlip?.()?.flip(target);
              }}
            >
              <div className="absolute inset-y-0 -top-2 -bottom-2 inset-x-0" />
              <motion.div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-amber-700 to-gold"
                animate={{ width: `${readingProgress}%` }}
                transition={{ ease: 'easeOut' }}
              />
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-gold rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                animate={{ left: `${readingProgress}%` }}
                style={{ marginLeft: '-4px' }}
              />
            </div>
            <span className="text-white/30 text-[11px] font-mono w-6 tabular-nums">{total}</span>
          </motion.footer>
        )}
      </AnimatePresence>

      {/* ── Thumbnail grid modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showThumbs && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-auto"
            style={{ background: 'rgba(10,6,3,0.97)', backdropFilter: 'blur(16px)' }}
          >
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/5"
              style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            >
              <h2 className="text-white font-[family-name:var(--font-display)] font-bold">
                {issue.title}
                <span className="text-white/30 font-normal text-sm mr-3">{total} صفحة</span>
              </h2>
              <button
                onClick={() => setShowThumbs(false)}
                className="p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/5 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-10 xl:grid-cols-12 gap-2 p-6">
              {pages.map((url, i) => {
                const isCurrent = i === currentPage || i === currentPage + 1;
                const isLocked = !isSubscriber && i >= FREE_PAGES;
                return (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: Math.min(i * 0.008, 0.3) }}
                    whileHover={{ scale: 1.06, zIndex: 10 }}
                    onClick={() => {
                      if (isLocked) {
                        setPaywallOpen(true);
                        return;
                      }
                      flipBookRef.current?.pageFlip?.()?.flip(i);
                      setShowThumbs(false);
                    }}
                    className={`relative aspect-[3/4] overflow-hidden rounded-sm border transition-all ${
                      isCurrent
                        ? 'border-gold shadow-lg shadow-gold/20'
                        : 'border-white/5 hover:border-white/25'
                    }`}
                  >
                    <img
                      src={url}
                      alt={`صفحة ${i + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1">
                      <span className="text-white/50 text-[9px] font-mono">{i + 1}</span>
                    </div>
                    {isCurrent && <div className="absolute inset-0 bg-gold/10" />}
                    {isLocked && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Lock size={12} className="text-gold/70" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Paywall modal ─────────────────────────────────────────────────────── */}
      <PaywallModal
        isOpen={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        reason="magazine_gate"
      />
    </div>
  );
}
