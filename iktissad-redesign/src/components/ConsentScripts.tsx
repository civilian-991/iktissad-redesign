'use client';

/**
 * ConsentScripts
 *
 * Loads Google Analytics and Google Ad Manager scripts only after
 * the user has given consent (analytics / advertising categories).
 *
 * Listens for the 'cookie-consent-saved' event fired by CookieConsent.tsx,
 * and also checks stored consent on initial mount for returning visitors.
 */

import { useEffect, useState } from 'react';
import Script from 'next/script';
import type { CookiePreferences } from '@/components/CookieConsent';

interface ConsentScriptsProps {
  gaMeasurementId?: string;
  gamNetworkCode?: string;
  nonce?: string;
}

function readStoredPreferences(): CookiePreferences | null {
  try {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent || consent === 'pending') return null;
    const raw = localStorage.getItem('cookie-preferences');
    if (!raw) return null;
    return JSON.parse(raw) as CookiePreferences;
  } catch {
    return null;
  }
}

export default function ConsentScripts({ gaMeasurementId, gamNetworkCode, nonce }: ConsentScriptsProps) {
  const [prefs, setPrefs] = useState<CookiePreferences | null>(null);

  useEffect(() => {
    // Check existing consent on mount (returning visitor)
    const stored = readStoredPreferences();
    if (stored) setPrefs(stored);

    // Listen for consent changes (new visitors accepting/customising)
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<CookiePreferences>).detail;
      setPrefs(detail);
    };
    window.addEventListener('cookie-consent-saved', handler);
    return () => window.removeEventListener('cookie-consent-saved', handler);
  }, []);

  if (!prefs) return null;

  return (
    <>
      {/* Google Analytics 4 — loaded only with analytics consent */}
      {prefs.analytics && gaMeasurementId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
            strategy="afterInteractive"
            nonce={nonce}
          />
          <Script
            id="ga-init"
            strategy="afterInteractive"
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaMeasurementId}', { anonymize_ip: true });
              `,
            }}
          />
        </>
      )}

      {/* Google Ad Manager — loaded only with advertising consent */}
      {prefs.advertising && gamNetworkCode && (
        <>
          <Script
            id="gpt-init"
            strategy="afterInteractive"
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `
                window.googletag = window.googletag || {cmd: []};
                googletag.cmd.push(function() {
                  googletag.pubads().enableSingleRequest();
                  googletag.pubads().collapseEmptyDivs();
                  googletag.enableServices();
                });
              `,
            }}
          />
          <Script
            nonce={nonce}
            src="https://securepubads.g.doubleclick.net/tag/js/gpt.js"
            strategy="afterInteractive"
          />
        </>
      )}
    </>
  );
}
