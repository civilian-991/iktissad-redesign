'use client';

/**
 * ConsentScripts
 *
 * Google Analytics loads for every visitor, as it did on the legacy
 * iktissadonline.com site, so the GA4 history the audience figures are sold on
 * stays comparable across the migration (a consent-gated GA only counts the
 * visitors who accept, which reads as a traffic drop). Google Ad Manager —
 * advertising cookies — still loads only after advertising consent.
 *
 * Listens for the 'cookie-consent-saved' event fired by CookieConsent.tsx,
 * and also checks stored consent on initial mount for returning visitors.
 */

import { useEffect, useState } from 'react';
import Script from 'next/script';
import type { CookiePreferences } from '@/components/CookieConsent';

interface ConsentScriptsProps {
  /** GA4 properties to report to; the first also loads gtag.js. */
  gaMeasurementIds?: string[];
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

export default function ConsentScripts({ gaMeasurementIds, gamNetworkCode, nonce }: ConsentScriptsProps) {
  const gaIds = gaMeasurementIds ?? [];
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

  return (
    <>
      {/* Google Analytics 4 — every visitor (see file comment) */}
      {gaIds.length > 0 && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaIds[0]}`}
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
                ${gaIds.map((id) => `gtag('config', ${JSON.stringify(id)}, { anonymize_ip: true });`).join('\n                ')}
              `,
            }}
          />
        </>
      )}

      {/* Google Ad Manager — loaded only with advertising consent */}
      {prefs?.advertising && gamNetworkCode && (
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
