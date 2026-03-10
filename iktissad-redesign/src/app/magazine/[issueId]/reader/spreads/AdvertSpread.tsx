'use client';

import Image from 'next/image';
import { useState } from 'react';

interface AdvertSpreadProps {
  imageUrl: string;
  targetUrl?: string | null;
  altText?: string | null;
  adId?: string | null;
}

export default function AdvertSpread({ imageUrl, targetUrl, altText, adId }: AdvertSpreadProps) {
  const [clicking, setClicking] = useState(false);

  async function handleAdClick() {
    if (clicking) return;
    setClicking(true);

    try {
      // Track impression click if we have an adId
      if (adId) {
        await fetch(`/api/ads/${adId}/click`, {
          method: 'POST',
          keepalive: true,
        }).catch(() => {
          // Non-critical — proceed regardless
        });
      }

      if (targetUrl) {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }
    } finally {
      setClicking(false);
    }
  }

  if (!imageUrl) {
    return (
      <div
        dir="rtl"
        style={{
          width: '100%',
          height: '100%',
          background: '#183B4E',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p
          style={{
            color: 'rgba(245,238,220,0.3)',
            fontFamily: 'var(--font-arabic)',
            fontSize: '13px',
          }}
        >
          إعلان
        </p>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: '#0e2330',
      }}
    >
      {/* ── "إعلان" label ──────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          insetInlineStart: '12px',
          zIndex: 20,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          borderRadius: '3px',
          padding: '3px 8px',
        }}
      >
        <span
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '10px',
            fontFamily: 'var(--font-arabic)',
            letterSpacing: '0.05em',
          }}
        >
          إعلان
        </span>
      </div>

      {/* ── Full-bleed ad image ────────────────────────────────────────── */}
      <div
        onClick={targetUrl ? handleAdClick : undefined}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          cursor: targetUrl ? 'pointer' : 'default',
          transition: 'opacity 0.15s',
          opacity: clicking ? 0.85 : 1,
        }}
        role={targetUrl ? 'link' : undefined}
        aria-label={altText ?? 'إعلان'}
        tabIndex={targetUrl ? 0 : undefined}
        onKeyDown={e => {
          if (targetUrl && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleAdClick();
          }
        }}
      >
        <Image
          src={imageUrl}
          alt={altText ?? 'إعلان'}
          fill
          sizes="100vw"
          style={{ objectFit: 'cover' }}
          priority={false}
        />

        {/* Click ripple indicator if clickable */}
        {targetUrl && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(221,168,83,0)',
              transition: 'background 0.15s',
            }}
            onMouseOver={e => {
              (e.currentTarget as HTMLDivElement).style.background = 'rgba(221,168,83,0.06)';
            }}
            onMouseOut={e => {
              (e.currentTarget as HTMLDivElement).style.background = 'rgba(221,168,83,0)';
            }}
          />
        )}
      </div>
    </div>
  );
}
