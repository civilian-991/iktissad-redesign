'use client';

/**
 * GiftArticleButton
 *
 * Shown on paywalled articles to active subscribers.
 * Creates a shareable gift link via POST /api/gift-links.
 * Copies the URL to clipboard and shows a toast.
 */

import { useState } from 'react';
import { Gift, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface GiftArticleButtonProps {
  articleId: string;
  /** Show as an icon-only button (for toolbar use) */
  compact?: boolean;
}

export default function GiftArticleButton({ articleId, compact = false }: GiftArticleButtonProps) {
  const [loading, setLoading] = useState(false);
  const [gifted, setGifted] = useState(false);

  const handleGift = async () => {
    if (loading || gifted) return;
    setLoading(true);

    try {
      const res = await fetch('/api/gift-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? 'تعذّر إنشاء رابط الهدية');
        return;
      }

      const { url } = json.data as { url: string; token: string; expiresAt: string };

      await navigator.clipboard.writeText(url);
      setGifted(true);
      toast.success('تم نسخ رابط الهدية!', {
        description: 'شارك هذا الرابط مع شخص ليقرأ المقال مجاناً',
        duration: 4000,
      });

      // Reset icon after 3 seconds
      setTimeout(() => setGifted(false), 3000);
    } catch {
      toast.error('تعذّر نسخ الرابط — حاول مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <button
        onClick={handleGift}
        disabled={loading}
        title="أهدِ هذا المقال"
        className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
          gifted
            ? 'border-emerald-400 text-emerald-600 bg-emerald-50'
            : 'border-sand text-charcoal/35 hover:border-gold/50 hover:text-gold'
        }`}
        aria-label="أهدِ هذا المقال"
      >
        {loading ? (
          <Loader2 size={12} className="animate-spin" />
        ) : gifted ? (
          <Check size={12} />
        ) : (
          <Gift size={12} />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleGift}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-sm text-[13px] font-[family-name:var(--font-display)] font-semibold border transition-all ${
        gifted
          ? 'border-emerald-400 text-emerald-600 bg-emerald-50'
          : 'border-gold/40 text-gold hover:bg-gold/5'
      }`}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : gifted ? (
        <Check size={14} />
      ) : (
        <Gift size={14} />
      )}
      {gifted ? 'تم نسخ الرابط' : 'أهدِ هذا المقال'}
    </button>
  );
}
