'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

export interface CookiePreferences {
  necessary: true;   // always on
  analytics: boolean;
  advertising: boolean;
}

const CONSENT_KEY = 'cookie-consent';
const PREFS_KEY = 'cookie-preferences';

function getStoredPreferences(): CookiePreferences | null {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CookiePreferences;
  } catch {
    return null;
  }
}

export function getConsentPreferences(): CookiePreferences | null {
  if (typeof window === 'undefined') return null;
  const consent = localStorage.getItem(CONSENT_KEY);
  if (!consent || consent === 'pending') return null;
  return getStoredPreferences();
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [advertising, setAdvertising] = useState(true);

  useEffect(() => {
    setMounted(true);
    const consent = localStorage.getItem(CONSENT_KEY);
    if (consent === null) {
      const timer = setTimeout(() => setVisible(true), 300);
      return () => clearTimeout(timer);
    }
  }, []);

  function saveAndClose(prefs: CookiePreferences) {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    setVisible(false);
    window.dispatchEvent(new CustomEvent('cookie-consent-saved', { detail: prefs }));
  }

  const handleAcceptAll = () =>
    saveAndClose({ necessary: true, analytics: true, advertising: true });

  const handleRejectAll = () => {
    localStorage.setItem(CONSENT_KEY, 'declined');
    localStorage.setItem(PREFS_KEY, JSON.stringify({ necessary: true, analytics: false, advertising: false }));
    setVisible(false);
    window.dispatchEvent(new CustomEvent('cookie-consent-saved', {
      detail: { necessary: true, analytics: false, advertising: false },
    }));
  };

  const handleSavePreferences = () =>
    saveAndClose({ necessary: true, analytics, advertising });

  if (!mounted) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="إشعار ملفات تعريف الارتباط"
      dir="rtl"
      className={`
        fixed bottom-0 inset-x-0 z-50
        transition-transform duration-500 ease-out
        ${visible ? 'translate-y-0' : 'translate-y-full'}
      `}
    >
      <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg, transparent, #DDA853, #DDA853 60%, transparent)' }} />

      <div className="w-full" style={{ backgroundColor: '#0C1E2A', borderTop: '1px solid rgba(221,168,83,0.25)' }}>

        {/* ── Customize panel ── */}
        {showCustomize && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 border-b border-gold/10 space-y-3">
            <p className="text-sm font-bold text-right" style={{ color: '#DDA853' }}>
              إدارة تفضيلات ملفات تعريف الارتباط
            </p>

            {/* Necessary — always on */}
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <div className="text-right">
                <p className="text-sm font-semibold" style={{ color: '#E5E7EB' }}>ضرورية</p>
                <p className="text-xs" style={{ color: '#6E98A2' }}>الجلسة، الأمان، CSRF — لا يمكن تعطيلها</p>
              </div>
              <div className="px-3 py-1 rounded text-xs font-bold" style={{ backgroundColor: 'rgba(221,168,83,0.15)', color: '#DDA853' }}>
                دائماً مفعّلة
              </div>
            </div>

            {/* Analytics */}
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <div className="text-right">
                <p className="text-sm font-semibold" style={{ color: '#E5E7EB' }}>التحليلات</p>
                <p className="text-xs" style={{ color: '#6E98A2' }}>Google Analytics — يساعدنا على تحسين المحتوى</p>
              </div>
              <button
                onClick={() => setAnalytics(!analytics)}
                className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${analytics ? '' : 'bg-white/10'}`}
                style={analytics ? { backgroundColor: '#DDA853' } : {}}
                aria-checked={analytics}
                role="switch"
              >
                <span
                  className="absolute top-1 w-4 h-4 bg-white rounded-full transition-all"
                  style={{ right: analytics ? '2px' : 'auto', left: analytics ? 'auto' : '2px' }}
                />
              </button>
            </div>

            {/* Advertising */}
            <div className="flex items-center justify-between py-2">
              <div className="text-right">
                <p className="text-sm font-semibold" style={{ color: '#E5E7EB' }}>الإعلانات</p>
                <p className="text-xs" style={{ color: '#6E98A2' }}>Google Ad Manager — إعلانات مخصصة</p>
              </div>
              <button
                onClick={() => setAdvertising(!advertising)}
                className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${advertising ? '' : 'bg-white/10'}`}
                style={advertising ? { backgroundColor: '#DDA853' } : {}}
                aria-checked={advertising}
                role="switch"
              >
                <span
                  className="absolute top-1 w-4 h-4 bg-white rounded-full transition-all"
                  style={{ right: advertising ? '2px' : 'auto', left: advertising ? 'auto' : '2px' }}
                />
              </button>
            </div>

            <button
              onClick={handleSavePreferences}
              className="w-full py-2 rounded text-sm font-bold transition-colors"
              style={{ backgroundColor: '#DDA853', color: '#0C1E2A' }}
            >
              حفظ التفضيلات
            </button>
          </div>
        )}

        {/* ── Main banner row ── */}
        <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">

          <div className="flex-1 text-right">
            <p className="text-sm font-bold mb-1" style={{ color: '#DDA853' }}>
              ملفات تعريف الارتباط (Cookies)
            </p>
            <p className="text-sm leading-relaxed" style={{ color: '#B5CCD2' }}>
              نستخدم ملفات تعريف الارتباط لتحسين تجربتك وتحليل حركة الزيارات.{' '}
              <Link href="/privacy" className="underline underline-offset-2" style={{ color: '#E5BA6F' }}>
                سياسة الخصوصية
              </Link>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            {/* Customize toggle */}
            <button
              onClick={() => setShowCustomize(!showCustomize)}
              className="px-4 py-2 rounded text-xs font-medium flex items-center gap-1 transition-colors"
              style={{ border: '1px solid rgba(221,168,83,0.3)', color: '#DDA853' }}
            >
              تخصيص
              {showCustomize ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
            </button>

            {/* Reject */}
            <button
              onClick={handleRejectAll}
              className="px-4 py-2 rounded text-sm font-medium transition-colors"
              style={{ border: '1px solid rgba(181,204,210,0.35)', color: '#B5CCD2' }}
            >
              رفض
            </button>

            {/* Accept all */}
            <button
              onClick={handleAcceptAll}
              className="px-5 py-2 rounded text-sm font-bold transition-colors"
              style={{ backgroundColor: '#DDA853', color: '#0C1E2A' }}
            >
              قبول الكل
            </button>

            <button
              onClick={handleRejectAll}
              aria-label="إغلاق"
              className="p-1.5 rounded transition-colors"
              style={{ color: '#6E98A2' }}
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
