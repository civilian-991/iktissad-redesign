'use client';

import { useState, useEffect, useRef } from 'react';
import { Bookmark } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useTranslation } from '@/lib/i18n';

interface BookmarkButtonProps {
  articleId: string;
  initialBookmarked?: boolean;
  /** Optional extra className for the button wrapper */
  className?: string;
}

export default function BookmarkButton({
  articleId,
  initialBookmarked = false,
  className = '',
}: BookmarkButtonProps) {
  const { t } = useTranslation();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check auth state on mount
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });

    // Listen for auth state changes (e.g. user logs in/out)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sync initial state when prop changes
  useEffect(() => {
    setBookmarked(initialBookmarked);
  }, [initialBookmarked]);

  function showFeedback(msg: string) {
    setFeedback(msg);
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 2000);
  }

  async function handleClick() {
    if (!isLoggedIn) {
      setShowTooltip(true);
      if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
      tooltipTimer.current = setTimeout(() => setShowTooltip(false), 3000);
      return;
    }

    if (isLoading) return;

    // Optimistic update
    const wasBookmarked = bookmarked;
    setBookmarked(!wasBookmarked);
    setIsLoading(true);

    try {
      if (wasBookmarked) {
        // Remove bookmark
        const res = await fetch(`/api/bookmarks/${articleId}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to remove bookmark');
        showFeedback(t('pages.bookmark.removed'));
      } else {
        // Add bookmark
        const res = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleId }),
        });
        if (!res.ok) throw new Error('Failed to save bookmark');
        showFeedback(t('pages.bookmark.saved'));
      }
    } catch {
      // Revert optimistic update on failure
      setBookmarked(wasBookmarked);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative inline-flex">
      <button
        onClick={handleClick}
        disabled={isLoading}
        title={bookmarked ? t('pages.bookmark.saved') : t('pages.bookmark.save')}
        aria-label={bookmarked ? t('pages.bookmark.saved') : t('pages.bookmark.save')}
        aria-pressed={bookmarked}
        className={`group flex items-center gap-1.5 transition-all disabled:opacity-60 ${className}`}
      >
        <Bookmark
          size={18}
          className={`transition-all duration-200 ${
            bookmarked
              ? 'fill-gold text-gold'
              : 'fill-transparent text-charcoal/40 group-hover:text-gold group-hover:fill-gold/20'
          }`}
        />
        <span
          className={`text-xs font-[family-name:var(--font-display)] font-semibold transition-colors ${
            bookmarked ? 'text-gold' : 'text-charcoal/40 group-hover:text-gold'
          }`}
        >
          {feedback
            ? feedback
            : bookmarked
            ? t('pages.bookmark.saved')
            : t('pages.bookmark.save')}
        </span>
      </button>

      {/* Login prompt tooltip */}
      {showTooltip && (
        <div
          className="absolute bottom-full mb-2 start-0 z-50 bg-obsidian text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg"
          dir="rtl"
        >
          {t('pages.bookmark.loginRequired')}
          <div className="absolute top-full start-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-obsidian" />
        </div>
      )}
    </div>
  );
}
