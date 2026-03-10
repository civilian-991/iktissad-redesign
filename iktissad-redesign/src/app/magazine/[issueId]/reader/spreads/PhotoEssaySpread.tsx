'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';

interface PhotoItem {
  src: string;
  alt: string;
  caption?: string;
  focalX?: number;
  focalY?: number;
}

interface PhotoEssaySpreadProps {
  images: PhotoItem[];
}

export default function PhotoEssaySpread({ images }: PhotoEssaySpreadProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Scroll to specific image on dot click
  function scrollToImage(index: number) {
    const strip = stripRef.current;
    if (!strip) return;
    const item = strip.children[index] as HTMLElement | null;
    if (item) {
      item.scrollIntoView({ behavior: 'smooth', inline: 'start' });
    }
    setActiveIndex(index);
  }

  // Track scroll position to update active dot
  function handleScroll() {
    const strip = stripRef.current;
    if (!strip) return;
    const scrollLeft = strip.scrollLeft;
    const itemWidth = strip.clientWidth;
    const index = Math.round(scrollLeft / itemWidth);
    setActiveIndex(Math.max(0, Math.min(index, images.length - 1)));
  }

  if (!images || images.length === 0) {
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
            color: 'rgba(245,238,220,0.4)',
            fontFamily: 'var(--font-arabic)',
            fontSize: '14px',
          }}
        >
          لا توجد صور
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
        background: '#0e2330',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* ── Horizontal scroll snap strip ─────────────────────────────── */}
      <div
        ref={stripRef}
        onScroll={handleScroll}
        style={{
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'row',
          overflowX: 'auto',
          overflowY: 'hidden',
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          // Hide scrollbar
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {images.map((img, i) => {
          const focalX = img.focalX ?? 0.5;
          const focalY = img.focalY ?? 0.5;

          return (
            <div
              key={i}
              style={{
                flex: '0 0 100%',
                height: '100%',
                scrollSnapAlign: 'start',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Image */}
              <div style={{ flex: '1 1 auto', position: 'relative', overflow: 'hidden' }}>
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  sizes="100vw"
                  style={{
                    objectFit: 'cover',
                    objectPosition: `${focalX * 100}% ${focalY * 100}%`,
                  }}
                />
              </div>

              {/* Caption */}
              {img.caption && (
                <div
                  style={{
                    flexShrink: 0,
                    padding: '10px 20px',
                    background: 'rgba(14,35,48,0.9)',
                    borderTop: '1px solid rgba(221,168,83,0.2)',
                  }}
                >
                  <p
                    style={{
                      color: 'rgba(245,238,220,0.75)',
                      fontSize: '12px',
                      fontFamily: 'var(--font-arabic)',
                      margin: 0,
                      textAlign: 'right',
                      lineHeight: '1.5',
                    }}
                  >
                    {img.caption}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Navigator dots ─────────────────────────────────────────────── */}
      {images.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            insetInline: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            zIndex: 10,
          }}
        >
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToImage(i)}
              aria-label={`الصورة ${i + 1}`}
              style={{
                width: i === activeIndex ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: i === activeIndex ? '#DDA853' : 'rgba(245,238,220,0.3)',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.3s ease',
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      )}

      {/* Image counter */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          insetInlineStart: '16px',
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          borderRadius: '12px',
          padding: '4px 12px',
          color: 'rgba(245,238,220,0.8)',
          fontSize: '12px',
          fontFamily: 'var(--font-arabic)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {activeIndex + 1} / {images.length}
      </div>
    </div>
  );
}
