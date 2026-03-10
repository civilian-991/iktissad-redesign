'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleCount?: number;
  maxFreeArticles?: number;
  reason: 'article_limit' | 'magazine_gate';
}

// ── Pricing tier mini card ────────────────────────────────────────────────────

function TierCard({
  name,
  price,
  features,
  highlighted,
}: {
  name: string;
  price: string;
  features: string[];
  highlighted?: boolean;
}) {
  return (
    <div
      style={{
        flex: '1 1 0',
        border: highlighted
          ? '1px solid #DDA853'
          : '1px solid rgba(255,255,255,0.1)',
        borderRadius: '3px',
        padding: '1rem 0.75rem',
        background: highlighted
          ? 'rgba(221,168,83,0.06)'
          : 'rgba(255,255,255,0.03)',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          color: highlighted ? '#DDA853' : 'rgba(245,238,220,0.6)',
          fontSize: '0.7rem',
          fontFamily: 'var(--font-body)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          margin: '0 0 0.4rem',
        }}
      >
        {name}
      </p>
      <p
        style={{
          color: '#F5EEDC',
          fontSize: '1rem',
          fontFamily: 'var(--font-body)',
          fontWeight: 800,
          margin: '0 0 0.75rem',
        }}
      >
        {price}
      </p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {features.map((f) => (
          <li
            key={f}
            style={{
              color: 'rgba(245,238,220,0.65)',
              fontSize: '0.72rem',
              fontFamily: 'var(--font-body)',
              marginBottom: '0.25rem',
              lineHeight: 1.4,
            }}
          >
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main PaywallModal ─────────────────────────────────────────────────────────

export default function PaywallModal({
  isOpen,
  onClose,
  articleCount = 0,
  maxFreeArticles = 5,
  reason,
}: PaywallModalProps) {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);

  // ── Close on Escape ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    firstFocusRef.current?.focus();
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // ── Focus trap ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = modalRef.current!.querySelectorAll<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])',
      );
      const arr = Array.from(focusable);
      const first = arr[0];
      const last = arr[arr.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first?.focus();
      }
    };
    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const usedPercent = Math.min(100, (articleCount / maxFreeArticles) * 100);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(24,59,78,0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 50,
        }}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={
          reason === 'article_limit'
            ? 'تجاوزت حد القراءة المجانية'
            : 'اشترك للوصول الكامل'
        }
        dir="rtl"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 51,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '28rem',
            background: '#183B4E',
            border: '1px solid rgba(221,168,83,0.3)',
            borderRadius: '4px',
            padding: '2rem',
            position: 'relative',
            boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
            animation: 'paywallIn 0.25s ease-out',
          }}
        >
          {/* Close button */}
          <button
            ref={firstFocusRef}
            onClick={onClose}
            aria-label="إغلاق"
            style={{
              position: 'absolute',
              top: '1rem',
              insetInlineEnd: '1rem',
              background: 'none',
              border: 'none',
              color: 'rgba(245,238,220,0.4)',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s',
              borderRadius: '2px',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#DDA853'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(245,238,220,0.4)'; }}
          >
            <X size={18} />
          </button>

          {reason === 'article_limit' ? (
            /* ── Article limit content ─────────────────────────────────── */
            <>
              {/* Gold ornament */}
              <div
                aria-hidden="true"
                style={{
                  width: '40px',
                  height: '2px',
                  background: '#DDA853',
                  margin: '0 auto 1.25rem',
                }}
              />

              <h2
                style={{
                  fontFamily: 'var(--font-body)',
                  color: '#F5EEDC',
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  textAlign: 'center',
                  margin: '0 0 0.75rem',
                  lineHeight: 1.3,
                }}
              >
                لقد وصلت إلى حد القراءة المجانية
              </h2>

              <p
                style={{
                  color: 'rgba(245,238,220,0.65)',
                  fontSize: '0.875rem',
                  fontFamily: 'var(--font-body)',
                  textAlign: 'center',
                  margin: '0 0 1.5rem',
                  lineHeight: 1.6,
                }}
              >
                لقد قرأت{' '}
                <strong style={{ color: '#DDA853' }}>{articleCount}</strong> من{' '}
                <strong style={{ color: '#DDA853' }}>{maxFreeArticles}</strong>{' '}
                مقالات مجانية هذا الشهر
              </p>

              {/* Usage progress bar */}
              <div
                style={{
                  height: '6px',
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: '3px',
                  marginBottom: '2rem',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${usedPercent}%`,
                    background: '#DDA853',
                    borderRadius: '3px',
                    transition: 'width 0.6s ease',
                  }}
                />
              </div>

              {/* Subscribe CTA */}
              <button
                onClick={() => router.push('/subscribe')}
                className="btn-gold"
                style={{ width: '100%', marginBottom: '0.75rem' }}
              >
                <span>اشترك الآن</span>
              </button>

              {/* Continue free link */}
              <button
                onClick={onClose}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  color: 'rgba(245,238,220,0.4)',
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-body)',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  textDecoration: 'underline',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(245,238,220,0.7)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(245,238,220,0.4)'; }}
              >
                استمر مجاناً
              </button>
            </>
          ) : (
            /* ── Magazine gate content ─────────────────────────────────── */
            <>
              {/* Gold ornament */}
              <div
                aria-hidden="true"
                style={{
                  width: '40px',
                  height: '2px',
                  background: '#DDA853',
                  margin: '0 auto 1.25rem',
                }}
              />

              <h2
                style={{
                  fontFamily: 'var(--font-body)',
                  color: '#F5EEDC',
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  textAlign: 'center',
                  margin: '0 0 0.75rem',
                  lineHeight: 1.3,
                }}
              >
                اشترك للوصول إلى العدد الكامل
              </h2>

              <p
                style={{
                  color: 'rgba(245,238,220,0.55)',
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-body)',
                  textAlign: 'center',
                  margin: '0 0 1.5rem',
                }}
              >
                اختر الخطة التي تناسبك
              </p>

              {/* Tier cards */}
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  marginBottom: '1.5rem',
                }}
              >
                <TierCard
                  name="مجاني"
                  price="0 ريال"
                  features={['5 مقالات/شهر', 'الغلاف فقط']}
                />
                <TierCard
                  name="رقمي"
                  price="49 ريال/شهر"
                  features={['العدد الكامل', 'تحميل PDF', '12 شهراً أرشيف']}
                  highlighted
                />
                <TierCard
                  name="مميز"
                  price="99 ريال/شهر"
                  features={['كل الأعداد', 'أرشيف 65 سنة', 'وصول مبكر']}
                />
              </div>

              {/* Trial CTA */}
              <button
                onClick={() =>
                  router.push(
                    `/subscribe?redirect=${encodeURIComponent(currentUrl)}`,
                  )
                }
                className="btn-gold"
                style={{ width: '100%' }}
              >
                <span>ابدأ تجربتك المجانية</span>
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
