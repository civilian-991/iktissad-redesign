'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  List,
  Maximize2,
  Minimize2,
  Share2,
  Bookmark,
  X,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReaderToolbarProps {
  onTOCToggle: () => void;
  onFullscreen: () => void;
  onShare: () => void;
  onBookmark: () => void;
  isFullscreen: boolean;
  currentSpread: number;
  totalSpreads: number;
  issueTitle: string;
  issueId?: string;
  isBookmarked?: boolean;
}

// ── Icon button helper ────────────────────────────────────────────────────────

function ToolbarButton({
  onClick,
  label,
  title,
  children,
  active = false,
}: {
  onClick: () => void;
  label: string;
  title: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        background: active ? 'rgba(221,168,83,0.15)' : 'none',
        border: 'none',
        color: active ? '#DDA853' : 'rgba(245,238,220,0.75)',
        cursor: 'pointer',
        padding: '0.5rem 0.6rem',
        borderRadius: '3px',
        transition: 'all 0.15s',
        fontFamily: 'var(--font-body)',
        fontSize: '0.8rem',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.color = '#DDA853';
        el.style.background = 'rgba(221,168,83,0.1)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.color = active ? '#DDA853' : 'rgba(245,238,220,0.75)';
        el.style.background = active ? 'rgba(221,168,83,0.15)' : 'none';
      }}
    >
      {children}
      {/* Label — hidden on small screens, visible md+ */}
      <span
        style={{
          display: 'none',
        }}
        className="toolbar-label"
      >
        {label}
      </span>
    </button>
  );
}

// ── Main ReaderToolbar ────────────────────────────────────────────────────────

export default function ReaderToolbar({
  onTOCToggle,
  onFullscreen,
  onShare,
  onBookmark,
  isFullscreen,
  currentSpread,
  totalSpreads,
  issueTitle,
  issueId,
  isBookmarked = false,
}: ReaderToolbarProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auto-hide logic ──────────────────────────────────────────────────────
  const showToolbar = useCallback(() => {
    setIsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 4000);
  }, []);

  useEffect(() => {
    // Initial show
    showToolbar();

    const handleActivity = () => showToolbar();

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('touchstart', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [showToolbar]);

  // ── Share handler ────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    const url = window.location.href;
    const title = issueTitle;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User cancelled or unsupported — fallback to clipboard
        await navigator.clipboard.writeText(url).catch(() => {});
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // Silent fail
      }
    }
    onShare();
  }, [issueTitle, onShare]);

  // ── Exit reader ──────────────────────────────────────────────────────────
  const handleExit = useCallback(() => {
    if (issueId) {
      router.push(`/magazine/${issueId}`);
    } else {
      router.push('/magazine');
    }
  }, [issueId, router]);

  return (
    <>
      {/* Responsive label styles injected inline */}
      <style>{`
        @media (min-width: 768px) {
          .toolbar-label { display: inline !important; }
        }
      `}</style>

      <div
        dir="rtl"
        className={`reader-toolbar${isVisible ? '' : ' hidden'}`}
        onMouseEnter={showToolbar}
        style={{
          position: 'fixed',
          top: 0,
          insetInline: 0,
          zIndex: 30,
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingInline: '12px',
          background:
            'linear-gradient(to bottom, rgba(24,59,78,0.92) 0%, rgba(24,59,78,0.6) 70%, transparent 100%)',
          backdropFilter: 'blur(8px)',
        }}
        aria-label="شريط أدوات القارئ"
      >
        {/* ── Right group (inline-start in RTL) — TOC + Fullscreen ─────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <ToolbarButton
            onClick={onTOCToggle}
            label="جدول المحتويات"
            title="جدول المحتويات"
          >
            <List size={18} />
          </ToolbarButton>

          <ToolbarButton
            onClick={onFullscreen}
            label={isFullscreen ? 'خروج من ملء الشاشة' : 'ملء الشاشة'}
            title={isFullscreen ? 'خروج من ملء الشاشة' : 'ملء الشاشة'}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </ToolbarButton>
        </div>

        {/* ── Center — Issue title + spread counter ────────────────────── */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            overflow: 'hidden',
            padding: '0 1rem',
          }}
        >
          <span
            style={{
              color: 'rgba(245,238,220,0.9)',
              fontSize: '0.85rem',
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
            }}
          >
            {issueTitle}
          </span>
          <span
            style={{
              color: '#DDA853',
              fontSize: '0.7rem',
              fontFamily: 'var(--font-body)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            الصفحة {currentSpread + 1} من {totalSpreads}
          </span>
        </div>

        {/* ── Left group (inline-end in RTL) — Share, Bookmark, Exit ──── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <ToolbarButton
            onClick={handleShare}
            label="مشاركة"
            title="مشاركة"
          >
            <Share2 size={18} />
          </ToolbarButton>

          <ToolbarButton
            onClick={onBookmark}
            label={isBookmarked ? 'إزالة من المفضلة' : 'حفظ في المفضلة'}
            title={isBookmarked ? 'إزالة من المفضلة' : 'حفظ في المفضلة'}
            active={isBookmarked}
          >
            <Bookmark
              size={18}
              fill={isBookmarked ? '#DDA853' : 'none'}
            />
          </ToolbarButton>

          <ToolbarButton
            onClick={handleExit}
            label="إغلاق القارئ"
            title="إغلاق القارئ"
          >
            <X size={18} />
          </ToolbarButton>
        </div>
      </div>
    </>
  );
}
