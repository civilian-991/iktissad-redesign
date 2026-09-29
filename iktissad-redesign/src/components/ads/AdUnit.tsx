'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { AdSlotName, ServedAd } from '@/lib/ads/placements';
import GamSlot, { gamAvailable } from './GamSlot';

/**
 * One ad slot. Asks /api/ads/serve which directly-booked creative to show;
 * when nothing is booked it falls back to Google Ad Manager (if configured and
 * the reader accepted advertising cookies), and otherwise renders nothing, so
 * an unsold slot never leaves a hole in the page.
 *
 * Impressions are counted when at least half the creative has been visible for
 * one continuous second (IAB viewability), not on page load — CPM campaigns are
 * billed on this number.
 */

const VIEWABLE_MS = 1000;

function useServedAd(slot: AdSlotName, section?: string | null) {
  const [ad, setAd] = useState<ServedAd | null>(null);
  const [resolved, setResolved] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams({ slot });
    if (section) qs.set('section', section);
    fetch(`/api/ads/serve?${qs}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled) return;
        setAd(json?.data ?? null);
        setResolved(true);
      })
      .catch(() => {
        if (!cancelled) setResolved(true);
      });
    return () => {
      cancelled = true;
    };
  }, [slot, section]);
  return { ad, resolved };
}

/** Direct booking missing → should this slot ask Google Ad Manager? */
function useBackfill(resolved: boolean, ad: ServedAd | null) {
  const [gamEmpty, setGamEmpty] = useState(false);
  const backfill = resolved && !ad && !gamEmpty && gamAvailable();
  return { backfill, onGamEmpty: () => setGamEmpty(true) };
}

function useViewableImpression(ad: ServedAd | null) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!ad || !el) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let sent = false;
    const send = () => {
      if (sent) return;
      sent = true;
      const body = JSON.stringify({ id: ad.id, placement: ad.placement });
      if (!navigator.sendBeacon?.('/api/ads/event', body)) {
        void fetch('/api/ads/event', { method: 'POST', body, keepalive: true }).catch(() => {});
      }
      observer.disconnect();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          timer ??= setTimeout(send, VIEWABLE_MS);
        } else if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      },
      { threshold: [0, 0.5] }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [ad]);
  return ref;
}

function Creative({ ad }: { ad: ServedAd }) {
  const clickHref = ad.clickUrl ? `${ad.clickUrl}?p=${ad.placement}` : null;

  if (ad.format === 'html5') {
    // IAB clickTag convention: the creative opens this URL when clicked, which
    // counts the click and redirects to the advertiser.
    const sep = ad.src.includes('?') ? '&' : '?';
    const clickTag = clickHref ? `${sep}clickTag=${encodeURIComponent(window.location.origin + clickHref)}` : '';
    return (
      <iframe
        src={ad.src + clickTag}
        width={ad.width}
        height={ad.height}
        title={ad.alt || 'advertisement'}
        loading="lazy"
        // No allow-same-origin: the creative can't read our cookies or DOM.
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        className="block max-w-full border-0"
        style={{ aspectRatio: `${ad.width} / ${ad.height}` }}
      />
    );
  }

  const img = (
    <picture>
      {ad.mobileSrc && <source media="(max-width: 767px)" srcSet={ad.mobileSrc} />}
      {/* Plain <img>, not next/image: creatives are served byte-for-byte (animated GIFs, agreed file weight). */}
      <img
        src={ad.src}
        alt={ad.alt}
        width={ad.width}
        height={ad.height}
        loading="lazy"
        decoding="async"
        className="block max-w-full h-auto"
      />
    </picture>
  );

  return clickHref ? (
    <a href={clickHref} target="_blank" rel="sponsored noopener" className="block">
      {img}
    </a>
  ) : (
    img
  );
}

export default function AdUnit({
  slot,
  section,
  className = '',
}: {
  slot: Exclude<AdSlotName, 'sticky_mobile'>;
  section?: string | null;
  className?: string;
}) {
  const { t } = useTranslation();
  const { ad, resolved } = useServedAd(slot, section);
  const ref = useViewableImpression(ad);
  const { backfill, onGamEmpty } = useBackfill(resolved, ad);

  if (!ad && !backfill) return null;

  return (
    <aside aria-label={t('ads.label')} className={`no-print flex justify-center ${className}`}>
      <div ref={ref} className="inline-flex flex-col items-center max-w-full">
        <span className="self-start mb-1 text-[10px] font-[family-name:var(--font-display)] tracking-wider text-charcoal/40">
          {t('ads.label')}
        </span>
        {ad ? <Creative ad={ad} /> : <GamSlot slot={slot} section={section} onEmpty={onGamEmpty} />}
      </div>
    </aside>
  );
}

const STICKY_DISMISS_KEY = 'ikt_sticky_ad_closed';
const PHONE_QUERY = '(max-width: 767px)';

function subscribePhone(onChange: () => void) {
  const mq = window.matchMedia(PHONE_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
const isPhone = () => window.matchMedia(PHONE_QUERY).matches;

function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(STICKY_DISMISS_KEY) === '1';
  } catch {
    // No sessionStorage (server render, private mode): show it.
    return false;
  }
}

/**
 * Sticky Mobile Banner: pinned to the bottom of the screen on phones only, and
 * always closable (the rate card promises the close button). Once closed it
 * stays closed for the rest of the browsing session.
 */
export function StickyMobileAd({ section }: { section?: string | null }) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(readDismissed);
  const isMobile = useSyncExternalStore(subscribePhone, isPhone, () => false);

  if (dismissed || !isMobile) return null;
  return <StickyMobileAdInner section={section} onClose={() => {
    setDismissed(true);
    try { sessionStorage.setItem(STICKY_DISMISS_KEY, '1'); } catch { /* private mode */ }
  }} closeLabel={t('ads.close')} adLabel={t('ads.label')} />;
}

// Split out so the serve request only fires on phones that haven't closed it.
function StickyMobileAdInner({
  section,
  onClose,
  closeLabel,
  adLabel,
}: {
  section?: string | null;
  onClose: () => void;
  closeLabel: string;
  adLabel: string;
}) {
  const { ad, resolved } = useServedAd('sticky_mobile', section);
  const ref = useViewableImpression(ad);
  const { backfill, onGamEmpty } = useBackfill(resolved, ad);
  if (!ad && !backfill) return null;

  return (
    <aside
      aria-label={adLabel}
      className="no-print fixed inset-x-0 bottom-0 z-40 flex justify-center bg-paper/95 border-t border-sand shadow-[0_-4px_16px_rgba(0,0,0,0.08)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div ref={ref} className="relative py-1">
        {ad ? <Creative ad={ad} /> : <GamSlot slot="sticky_mobile" section={section} onEmpty={onGamEmpty} />}
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="absolute -top-4 end-[-12px] w-8 h-8 rounded-full bg-obsidian text-paper flex items-center justify-center shadow focus-visible:outline-2 focus-visible:outline-gold"
        >
          <X size={14} />
        </button>
      </div>
    </aside>
  );
}
