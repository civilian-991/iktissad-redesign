'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const consent = localStorage.getItem('cookie-consent');
    if (consent === null) {
      // Small delay so the slide-up animation is visible on first render
      const timer = setTimeout(() => setVisible(true), 300);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setVisible(false);
    window.dispatchEvent(new Event('cookie-consent-accepted'));
  };

  const handleDecline = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setVisible(false);
  };

  // Don't render anything until mounted to avoid hydration mismatch
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
      {/* Gold top border accent */}
      <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg, transparent, #DDA853, #DDA853 60%, transparent)' }} />

      {/* Banner body */}
      <div
        className="w-full px-4 py-5 sm:px-6 lg:px-8"
        style={{ backgroundColor: '#0C1E2A', borderTop: '1px solid rgba(221,168,83,0.25)' }}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">

          {/* Text content */}
          <div className="flex-1 text-right">
            <p className="text-sm font-bold mb-1" style={{ color: '#DDA853' }}>
              ملفات تعريف الارتباط (Cookies)
            </p>
            <p className="text-sm leading-relaxed" style={{ color: '#B5CCD2' }}>
              نستخدم ملفات تعريف الارتباط لتحسين تجربتك وتحليل حركة الزيارات. بالنقر على «قبول»، فإنك توافق على استخدامنا لها وفقاً لـ{' '}
              <Link
                href="/privacy"
                className="underline underline-offset-2 transition-colors duration-200"
                style={{ color: '#E5BA6F' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#DDA853')}
                onMouseLeave={e => (e.currentTarget.style.color = '#E5BA6F')}
              >
                سياسة الخصوصية
              </Link>
              .
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Accept button */}
            <button
              onClick={handleAccept}
              className="
                px-5 py-2 rounded text-sm font-bold
                transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-offset-2
              "
              style={{
                backgroundColor: '#DDA853',
                color: '#0C1E2A',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#E5BA6F')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#DDA853')}
              onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 2px #0C1E2A, 0 0 0 4px #DDA853')}
              onBlur={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              قبول الكل
            </button>

            {/* Decline button */}
            <button
              onClick={handleDecline}
              className="
                px-5 py-2 rounded text-sm font-medium
                transition-colors duration-200
                focus:outline-none
              "
              style={{
                border: '1px solid rgba(181,204,210,0.35)',
                color: '#B5CCD2',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(181,204,210,0.7)';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(181,204,210,0.35)';
                e.currentTarget.style.color = '#B5CCD2';
              }}
              onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 2px #0C1E2A, 0 0 0 4px rgba(181,204,210,0.5)')}
              onBlur={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              رفض
            </button>

            {/* X close button (same as decline) */}
            <button
              onClick={handleDecline}
              aria-label="إغلاق"
              className="
                p-1.5 rounded
                transition-colors duration-200
                focus:outline-none
              "
              style={{ color: '#6E98A2' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#B5CCD2')}
              onMouseLeave={e => (e.currentTarget.style.color = '#6E98A2')}
              onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 2px rgba(181,204,210,0.4)')}
              onBlur={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
