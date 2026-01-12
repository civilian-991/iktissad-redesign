'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Home,
  Download,
  Share2,
  BookOpen,
  Grid3X3,
  X,
  Menu
} from 'lucide-react';
import Link from 'next/link';

// Mock magazine pages - in production these would come from an API
const generateMockPages = (issueId: string) => {
  const baseImages = [
    'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=1100&fit=crop',
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=1100&fit=crop',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=1100&fit=crop',
    'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=1100&fit=crop',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=1100&fit=crop',
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&h=1100&fit=crop',
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=1100&fit=crop',
    'https://images.unsplash.com/photo-1553484771-371a605b060b?w=800&h=1100&fit=crop',
    'https://images.unsplash.com/photo-1444653614773-995cb1ef9efa?w=800&h=1100&fit=crop',
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=1100&fit=crop',
  ];

  return Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    image: baseImages[i % baseImages.length],
    title: i === 0 ? 'الغلاف' : i === 1 ? 'فهرس المحتويات' : `صفحة ${i + 1}`,
  }));
};

const magazineInfo: Record<string, { title: string; subtitle: string; pages: number }> = {
  'AR0542': { title: 'العدد 542', subtitle: 'يناير 2026', pages: 84 },
  'AR0541': { title: 'العدد 541', subtitle: 'ديسمبر 2025', pages: 78 },
  'AR0540': { title: 'العدد 540', subtitle: 'نوفمبر 2025', pages: 72 },
};

export default function MagazineBrowsePage({ params }: { params: Promise<{ issueId: string }> }) {
  const [issueId, setIssueId] = useState<string>('');
  const [currentSpread, setCurrentSpread] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [showMenu, setShowMenu] = useState(true);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);

  useEffect(() => {
    params.then(p => setIssueId(p.issueId));
  }, [params]);

  const pages = generateMockPages(issueId);
  const info = magazineInfo[issueId] || { title: 'المجلة', subtitle: '', pages: 20 };

  // Calculate spreads (2 pages per spread, except first and last)
  const totalSpreads = Math.ceil(pages.length / 2);

  const goToNextSpread = useCallback(() => {
    if (currentSpread < totalSpreads - 1 && !isFlipping) {
      setIsFlipping(true);
      setFlipDirection('next');
      setTimeout(() => {
        setCurrentSpread(s => s + 1);
        setIsFlipping(false);
        setFlipDirection(null);
      }, 400);
    }
  }, [currentSpread, totalSpreads, isFlipping]);

  const goToPrevSpread = useCallback(() => {
    if (currentSpread > 0 && !isFlipping) {
      setIsFlipping(true);
      setFlipDirection('prev');
      setTimeout(() => {
        setCurrentSpread(s => s - 1);
        setIsFlipping(false);
        setFlipDirection(null);
      }, 400);
    }
  }, [currentSpread, isFlipping]);

  const goToSpread = (spread: number) => {
    setCurrentSpread(spread);
    setShowThumbnails(false);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToNextSpread();
      if (e.key === 'ArrowRight') goToPrevSpread();
      if (e.key === 'Escape') {
        setShowThumbnails(false);
        if (isFullscreen) toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextSpread, goToPrevSpread, isFullscreen]);

  // Auto-hide menu
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const handleMouseMove = () => {
      setShowMenu(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowMenu(false), 3000);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeout);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const leftPageIndex = currentSpread * 2;
  const rightPageIndex = currentSpread * 2 + 1;
  const leftPage = pages[leftPageIndex];
  const rightPage = pages[rightPageIndex];

  if (!issueId) return null;

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col">
      {/* Top Bar */}
      <AnimatePresence>
        {showMenu && (
          <motion.header
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent"
          >
            <div className="flex items-center justify-between px-6 py-4">
              {/* Left Side */}
              <div className="flex items-center gap-4">
                <Link
                  href="/magazine"
                  className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                >
                  <Home size={20} />
                  <span className="hidden md:inline font-[family-name:var(--font-display)]">العودة للأرشيف</span>
                </Link>
              </div>

              {/* Center - Title */}
              <div className="text-center">
                <h1 className="text-white font-[family-name:var(--font-display)] font-bold text-lg">
                  {info.title}
                </h1>
                <p className="text-white/60 text-sm">{info.subtitle}</p>
              </div>

              {/* Right Side */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowThumbnails(!showThumbnails)}
                  className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all"
                  title="عرض الصفحات"
                >
                  <Grid3X3 size={20} />
                </button>
                <button
                  onClick={() => setZoom(z => Math.min(2, z + 0.25))}
                  className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all"
                  title="تكبير"
                >
                  <ZoomIn size={20} />
                </button>
                <button
                  onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                  className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all"
                  title="تصغير"
                >
                  <ZoomOut size={20} />
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all"
                  title="ملء الشاشة"
                >
                  {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                </button>
                <button
                  className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all"
                  title="مشاركة"
                >
                  <Share2 size={20} />
                </button>
                <button
                  className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all"
                  title="تحميل"
                >
                  <Download size={20} />
                </button>
              </div>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Navigation Buttons */}
        <button
          onClick={goToPrevSpread}
          disabled={currentSpread === 0}
          className="absolute right-4 z-30 p-4 rounded-full bg-white/10 backdrop-blur-sm text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20 transition-all"
        >
          <ChevronRight size={32} />
        </button>

        <button
          onClick={goToNextSpread}
          disabled={currentSpread === totalSpreads - 1}
          className="absolute left-4 z-30 p-4 rounded-full bg-white/10 backdrop-blur-sm text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/20 transition-all"
        >
          <ChevronLeft size={32} />
        </button>

        {/* Book Spread */}
        <div
          className="relative perspective-[2000px]"
          style={{ transform: `scale(${zoom})` }}
        >
          <div className="flex shadow-2xl">
            {/* Right Page (in RTL, this is the "first" page visually on right) */}
            <motion.div
              key={`right-${currentSpread}`}
              initial={{ rotateY: flipDirection === 'prev' ? -90 : 0, opacity: flipDirection === 'prev' ? 0 : 1 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="relative origin-left"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {rightPage && (
                <div className="w-[350px] md:w-[400px] lg:w-[450px] aspect-[3/4] bg-white relative overflow-hidden">
                  <img
                    src={rightPage.image}
                    alt={rightPage.title}
                    className="w-full h-full object-cover"
                  />
                  {/* Page number */}
                  <div className="absolute bottom-4 left-4 text-white/80 text-sm font-[family-name:var(--font-display)] bg-black/30 px-2 py-1 rounded">
                    {rightPageIndex + 1}
                  </div>
                  {/* Page edge effect */}
                  <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/20 to-transparent" />
                </div>
              )}
            </motion.div>

            {/* Left Page (in RTL, this is the "second" page visually on left) */}
            <motion.div
              key={`left-${currentSpread}`}
              initial={{ rotateY: flipDirection === 'next' ? 90 : 0, opacity: flipDirection === 'next' ? 0 : 1 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="relative origin-right"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {leftPage && (
                <div className="w-[350px] md:w-[400px] lg:w-[450px] aspect-[3/4] bg-white relative overflow-hidden">
                  <img
                    src={leftPage.image}
                    alt={leftPage.title}
                    className="w-full h-full object-cover"
                  />
                  {/* Page number */}
                  <div className="absolute bottom-4 right-4 text-white/80 text-sm font-[family-name:var(--font-display)] bg-black/30 px-2 py-1 rounded">
                    {leftPageIndex + 1}
                  </div>
                  {/* Page edge effect */}
                  <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/20 to-transparent" />
                </div>
              )}
            </motion.div>
          </div>

          {/* Book spine */}
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-4 bg-gradient-to-r from-black/40 via-black/20 to-black/40 z-10" />
        </div>
      </div>

      {/* Bottom Bar */}
      <AnimatePresence>
        {showMenu && (
          <motion.footer
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/80 to-transparent"
          >
            <div className="px-6 py-4">
              {/* Progress Bar */}
              <div className="max-w-2xl mx-auto mb-4">
                <div className="flex items-center gap-4">
                  <span className="text-white/60 text-sm font-[family-name:var(--font-display)]">
                    {leftPageIndex + 1}
                  </span>
                  <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gold"
                      initial={false}
                      animate={{ width: `${((currentSpread + 1) / totalSpreads) * 100}%` }}
                    />
                  </div>
                  <span className="text-white/60 text-sm font-[family-name:var(--font-display)]">
                    {pages.length}
                  </span>
                </div>
              </div>

              {/* Page Thumbnails */}
              <div className="flex justify-center gap-1 overflow-x-auto pb-2 scrollbar-hide">
                {Array.from({ length: totalSpreads }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => goToSpread(i)}
                    className={`flex-shrink-0 w-12 h-16 rounded overflow-hidden border-2 transition-all ${
                      currentSpread === i ? 'border-gold scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={pages[i * 2]?.image || ''}
                      alt={`صفحة ${i * 2 + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>

      {/* Thumbnail Grid Modal */}
      <AnimatePresence>
        {showThumbnails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 overflow-auto"
          >
            <div className="sticky top-0 bg-black/80 backdrop-blur-sm p-4 flex items-center justify-between z-10">
              <h2 className="text-white font-[family-name:var(--font-display)] font-bold text-xl">
                جميع الصفحات
              </h2>
              <button
                onClick={() => setShowThumbnails(false)}
                className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
              >
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 p-6">
              {pages.map((page, i) => (
                <motion.button
                  key={page.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => goToSpread(Math.floor(i / 2))}
                  className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                    Math.floor(i / 2) === currentSpread ? 'border-gold' : 'border-transparent'
                  }`}
                >
                  <img
                    src={page.image}
                    alt={page.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <span className="text-white text-xs font-[family-name:var(--font-display)]">
                      {i + 1}
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
