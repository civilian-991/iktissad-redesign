'use client';

import { useEffect, useId, useState } from 'react';
import { GAM_UNITS, type AdSlotName } from '@/lib/ads/placements';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    googletag: any;
  }
}

const MOBILE_QUERY = '(max-width: 767px)';

/**
 * The Ad Manager network for this page, or '' when Ad Manager is off. The root
 * layout emits <meta name="ikt-gam"> only on production (not preview/local),
 * so test traffic never reaches real campaigns.
 */
function networkCode(): string {
  if (typeof document === 'undefined') return '';
  return document.querySelector('meta[name="ikt-gam"]')?.getAttribute('content') ?? '';
}

/** True when Ad Manager is on for this page and the reader accepted advertising cookies. */
export function gamAvailable(): boolean {
  if (!networkCode()) return false;
  try {
    return JSON.parse(localStorage.getItem('cookie-preferences') ?? 'null')?.advertising === true;
  } catch {
    return false;
  }
}

/**
 * Google Ad Manager backfill for a slot no direct campaign filled. Requests
 * the legacy site's ad unit for this slot (GAM_UNITS) — desktop or mobile unit
 * chosen by viewport — with the section slug as `section` key-value
 * targeting. GPT itself is loaded by <ConsentScripts> after advertising
 * consent; commands queue until it arrives. Collapses when Google returns
 * nothing.
 */
export default function GamSlot({
  slot,
  section,
  onEmpty,
}: {
  slot: AdSlotName;
  section?: string | null;
  onEmpty?: () => void;
}) {
  const divId = `gam-${slot}-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    const code = networkCode();
    const units = GAM_UNITS[slot];
    const target = window.matchMedia(MOBILE_QUERY).matches ? units.mobile : units.desktop;
    if (!code || !target) {
      setEmpty(true);
      onEmpty?.();
      return;
    }

    window.googletag = window.googletag || { cmd: [] };
    const gt = window.googletag;
    let defined: any = null;
    let listener: ((e: any) => void) | null = null;

    gt.cmd.push(() => {
      defined = gt.defineSlot(`/${code}/${target.unit}`, target.sizes, divId);
      if (!defined) return;
      if (section) defined.setTargeting('section', section);
      defined.setTargeting('site', 'iktissad.com');
      defined.addService(gt.pubads());
      listener = (e: any) => {
        if (e.slot === defined && e.isEmpty) {
          setEmpty(true);
          onEmpty?.();
        }
      };
      gt.pubads().addEventListener('slotRenderEnded', listener);
      gt.enableServices();
      gt.display(divId);
    });

    return () => {
      gt.cmd.push(() => {
        if (listener) gt.pubads().removeEventListener?.('slotRenderEnded', listener);
        if (defined) gt.destroySlots([defined]);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot, section, divId]);

  if (empty) return null;
  return <div id={divId} />;
}
