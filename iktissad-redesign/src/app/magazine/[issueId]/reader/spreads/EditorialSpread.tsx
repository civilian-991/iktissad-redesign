'use client';

import Image from 'next/image';
import type { MagazineSpread, MagazineSection } from '@/types';

interface ZoneData {
  imageUrl?: string;
  imageAlt?: string;
  focalX?: number;
  focalY?: number;
  sectionName?: string;
  headline?: string;
  deck?: string;
  author?: string;
  body?: string;
  pullQuote?: string;
  pullQuoteAttribution?: string;
  backgroundColor?: string;
  accentColor?: string;
}

interface EditorialSpreadProps {
  spread: MagazineSpread;
  sections: MagazineSection[];
}

// ── Hero-left template (default): 60% image right + 40% text left (RTL) ──────

function HeroLeftTemplate({ zones, section }: { zones: ZoneData; section?: MagazineSection }) {
  const focalX = zones.focalX ?? 0.5;
  const focalY = zones.focalY ?? 0.5;
  const accentColor = zones.accentColor ?? section?.themeColor ?? '#DDA853';
  const bg = zones.backgroundColor ?? '#F5EEDC';

  return (
    <div
      dir="rtl"
      style={{
        width: '100%',
        height: '100%',
        display: 'grid',
        // RTL: right side (inline-start) = hero image, left side = text
        gridTemplateColumns: '60% 40%',
        background: bg,
      }}
    >
      {/* ── Right (inline-start): Hero image ───────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        {zones.imageUrl ? (
          <Image
            src={zones.imageUrl}
            alt={zones.imageAlt ?? zones.headline ?? ''}
            fill
            sizes="60vw"
            style={{
              objectFit: 'cover',
              objectPosition: `${focalX * 100}% ${focalY * 100}%`,
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #27548A 0%, #183B4E 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(221,168,83,0.3)" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}

        {/* Image caption overlay at bottom */}
        {zones.imageAlt && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              insetInline: 0,
              padding: '8px 12px',
              background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
            }}
          >
            <p
              style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: '10px',
                fontFamily: 'var(--font-arabic)',
                margin: 0,
              }}
            >
              {zones.imageAlt}
            </p>
          </div>
        )}
      </div>

      {/* ── Left (inline-end): Article text ────────────────────────────── */}
      <div
        style={{
          padding: '40px 32px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
          borderInlineStart: `3px solid ${accentColor}`,
        }}
      >
        {/* Section badge */}
        {(zones.sectionName ?? section?.name) && (
          <div
            style={{
              display: 'inline-flex',
              alignSelf: 'flex-start',
              background: accentColor,
              color: '#183B4E',
              fontSize: '10px',
              fontFamily: 'var(--font-arabic)',
              fontWeight: '700',
              letterSpacing: '0.08em',
              padding: '3px 10px',
              borderRadius: '2px',
              marginBottom: '20px',
            }}
          >
            {zones.sectionName ?? section?.name}
          </div>
        )}

        {/* Headline */}
        {zones.headline && (
          <h2
            style={{
              color: '#183B4E',
              fontSize: 'clamp(1.25rem, 2.5vw, 2rem)',
              fontFamily: 'var(--font-arabic)',
              fontWeight: '800',
              lineHeight: '1.35',
              margin: '0 0 16px',
            }}
          >
            {zones.headline}
          </h2>
        )}

        {/* Deck / standfirst */}
        {zones.deck && (
          <p
            style={{
              color: '#27548A',
              fontSize: '14px',
              fontFamily: 'var(--font-arabic)',
              lineHeight: '1.7',
              margin: '0 0 20px',
              fontWeight: '500',
            }}
          >
            {zones.deck}
          </p>
        )}

        {/* Pull quote */}
        {zones.pullQuote && (
          <blockquote
            style={{
              borderInlineStart: `3px solid ${accentColor}`,
              paddingInlineStart: '16px',
              margin: '0 0 20px 0',
            }}
          >
            <p
              style={{
                color: '#183B4E',
                fontSize: '15px',
                fontFamily: 'var(--font-arabic)',
                fontStyle: 'italic',
                fontWeight: '600',
                lineHeight: '1.6',
                margin: '0 0 6px',
              }}
            >
              «{zones.pullQuote}»
            </p>
            {zones.pullQuoteAttribution && (
              <cite
                style={{
                  color: accentColor,
                  fontSize: '11px',
                  fontFamily: 'var(--font-arabic)',
                  fontStyle: 'normal',
                  fontWeight: '700',
                }}
              >
                — {zones.pullQuoteAttribution}
              </cite>
            )}
          </blockquote>
        )}

        {/* Body text */}
        {zones.body && (
          <div
            style={{
              color: '#3a3a3a',
              fontSize: '13px',
              fontFamily: 'var(--font-arabic)',
              lineHeight: '1.8',
              textAlign: 'justify',
              flex: '1 1 auto',
              overflow: 'hidden',
              WebkitLineClamp: 12,
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
            }}
          >
            {zones.body}
          </div>
        )}

        {/* Author */}
        {zones.author && (
          <div
            style={{
              marginTop: 'auto',
              paddingTop: '16px',
              borderTop: '1px solid rgba(24,59,78,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: accentColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#183B4E',
                fontSize: '12px',
                fontWeight: '700',
                flexShrink: 0,
              }}
            >
              {zones.author.charAt(0)}
            </div>
            <span
              style={{
                color: '#27548A',
                fontSize: '12px',
                fontFamily: 'var(--font-arabic)',
                fontWeight: '600',
              }}
            >
              {zones.author}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Two-column text template ─────────────────────────────────────────────────

function TwoColumnTemplate({ zones, section }: { zones: ZoneData; section?: MagazineSection }) {
  const accentColor = zones.accentColor ?? section?.themeColor ?? '#DDA853';

  return (
    <div
      dir="rtl"
      style={{
        width: '100%',
        height: '100%',
        background: zones.backgroundColor ?? '#F5EEDC',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0',
        overflow: 'hidden',
      }}
    >
      {/* Column 1 (right in RTL) */}
      <div
        style={{
          padding: '48px 36px',
          borderInlineEnd: '1px solid rgba(24,59,78,0.1)',
          overflow: 'hidden',
        }}
      >
        {zones.sectionName && (
          <div
            style={{
              color: accentColor,
              fontSize: '11px',
              fontFamily: 'var(--font-arabic)',
              fontWeight: '700',
              letterSpacing: '0.08em',
              marginBottom: '20px',
            }}
          >
            {zones.sectionName}
          </div>
        )}
        {zones.headline && (
          <h2
            style={{
              color: '#183B4E',
              fontSize: 'clamp(1.25rem, 2.5vw, 2rem)',
              fontFamily: 'var(--font-arabic)',
              fontWeight: '800',
              lineHeight: '1.35',
              margin: '0 0 16px',
            }}
          >
            {zones.headline}
          </h2>
        )}
        {zones.deck && (
          <p
            style={{
              color: '#27548A',
              fontSize: '14px',
              fontFamily: 'var(--font-arabic)',
              lineHeight: '1.7',
              margin: '0',
            }}
          >
            {zones.deck}
          </p>
        )}
      </div>

      {/* Column 2 (left in RTL) */}
      <div style={{ padding: '48px 36px', overflow: 'hidden' }}>
        {zones.body && (
          <p
            style={{
              color: '#3a3a3a',
              fontSize: '13px',
              fontFamily: 'var(--font-arabic)',
              lineHeight: '1.8',
              textAlign: 'justify',
              margin: '0',
            }}
          >
            {zones.body}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Full-bleed hero template ─────────────────────────────────────────────────

function HeroFullTemplate({ zones }: { zones: ZoneData }) {
  const focalX = zones.focalX ?? 0.5;
  const focalY = zones.focalY ?? 0.3;

  return (
    <div
      dir="rtl"
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
    >
      {zones.imageUrl ? (
        <Image
          src={zones.imageUrl}
          alt={zones.imageAlt ?? zones.headline ?? ''}
          fill
          sizes="100vw"
          style={{
            objectFit: 'cover',
            objectPosition: `${focalX * 100}% ${focalY * 100}%`,
          }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #27548A, #183B4E)' }} />
      )}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(24,59,78,0.9) 0%, rgba(24,59,78,0.1) 60%, transparent 100%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          bottom: '48px',
          insetInline: '48px',
        }}
      >
        {zones.sectionName && (
          <div
            style={{
              color: '#DDA853',
              fontSize: '11px',
              fontFamily: 'var(--font-arabic)',
              fontWeight: '700',
              letterSpacing: '0.1em',
              marginBottom: '12px',
            }}
          >
            {zones.sectionName}
          </div>
        )}
        {zones.headline && (
          <h2
            style={{
              color: '#F5EEDC',
              fontSize: 'clamp(1.5rem, 3.5vw, 3rem)',
              fontFamily: 'var(--font-arabic)',
              fontWeight: '900',
              lineHeight: '1.25',
              margin: '0 0 12px',
              textShadow: '0 2px 12px rgba(0,0,0,0.5)',
            }}
          >
            {zones.headline}
          </h2>
        )}
        {zones.deck && (
          <p
            style={{
              color: 'rgba(245,238,220,0.8)',
              fontSize: '14px',
              fontFamily: 'var(--font-arabic)',
              lineHeight: '1.6',
              margin: '0',
            }}
          >
            {zones.deck}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main component — picks template by templateId ─────────────────────────────

export default function EditorialSpread({ spread, sections }: EditorialSpreadProps) {
  const zones = spread.zones as ZoneData;
  const section = sections.find(s => s.id === spread.sectionId);

  switch (spread.templateId) {
    case 'hero-right':
    case 'hero-left':
      return <HeroLeftTemplate zones={zones} section={section} />;
    case 'hero-full':
    case 'opening-spread':
    case 'interview':
      return <HeroFullTemplate zones={zones} />;
    case 'two-column':
    case 'text-heavy':
    case 'infographic':
      return <TwoColumnTemplate zones={zones} section={section} />;
    default:
      // Default to hero-left
      return <HeroLeftTemplate zones={zones} section={section} />;
  }
}
