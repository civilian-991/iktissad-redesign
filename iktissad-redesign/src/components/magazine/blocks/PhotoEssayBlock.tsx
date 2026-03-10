'use client'

import { useState, useRef } from 'react'
import NextImage from 'next/image'
import type { PhotoEssayBlock } from '@/types'

interface Props {
  block: PhotoEssayBlock
}

/**
 * PhotoEssayBlock — Horizontal scroll-snap photo strip within article body.
 *
 * - CSS scroll-snap-type: x mandatory
 * - Each image: min-width 80%, scroll-snap-align center
 * - RTL-aware prev/next arrows (prev = right arrow, next = left arrow in RTL)
 * - Dot navigation below strip
 * - Height fixed at 400px; images use object-fit: cover
 */
export function PhotoEssayBlock({ block }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  if (!block.images?.length) return null

  const scrollTo = (index: number) => {
    const container = scrollRef.current
    if (!container) return
    const child = container.children[index] as HTMLElement
    if (!child) return
    child.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    setActiveIndex(index)
  }

  const handleScroll = () => {
    const container = scrollRef.current
    if (!container) return
    const itemWidth = container.clientWidth * 0.8
    const newIndex = Math.round(container.scrollLeft / itemWidth)
    setActiveIndex(Math.max(0, Math.min(newIndex, block.images.length - 1)))
  }

  // RTL: "next" = scroll right (visual left) → decrease scrollLeft
  // But scroll-snap + scrollIntoView handles the math, so we just move index
  const goNext = () => scrollTo(Math.min(activeIndex + 1, block.images.length - 1))
  const goPrev = () => scrollTo(Math.max(activeIndex - 1, 0))

  return (
    <figure
      dir="rtl"
      style={{
        marginBlockStart: '2em',
        marginBlockEnd: '2em',
        marginInline: 0,
        position: 'relative',
      }}
      className="magazine-photo-essay"
    >
      {/* Scroll strip */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollBehavior: 'smooth',
          gap: '0.75rem',
          paddingInline: '10%',
          /* Hide scrollbar visually */
          msOverflowStyle: 'none',
        }}
        className="photo-essay-strip"
      >
        {block.images.map((img, i) => (
          <div
            key={i}
            style={{
              minWidth: '80%',
              height: '400px',
              scrollSnapAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
              flexShrink: 0,
              borderRadius: '0.25rem',
            }}
          >
            <NextImage
              src={img.src}
              alt={img.alt}
              fill
              sizes="80vw"
              style={{
                objectFit: 'cover',
                objectPosition: `${(img.focalX ?? 0.5) * 100}% ${(img.focalY ?? 0.5) * 100}%`,
              }}
            />
            {img.caption && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  insetInline: 0,
                  background: 'linear-gradient(to top, rgba(24,59,78,0.85) 0%, transparent 100%)',
                  padding: '1rem',
                  color: '#F5EEDC',
                  fontFamily: "var(--font-body, 'Tajawal', sans-serif)",
                  fontSize: '0.85rem',
                  fontStyle: 'italic',
                  lineHeight: 1.5,
                }}
              >
                {img.caption}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Navigation arrows */}
      {block.images.length > 1 && (
        <>
          <button
            onClick={goPrev}
            disabled={activeIndex === 0}
            aria-label="الصورة السابقة"
            style={{
              position: 'absolute',
              top: '50%',
              insetInlineEnd: '0.75rem',
              transform: 'translateY(-50%)',
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '50%',
              background: 'rgba(24,59,78,0.75)',
              border: '1px solid rgba(221,168,83,0.4)',
              color: '#DDA853',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: activeIndex === 0 ? 'not-allowed' : 'pointer',
              opacity: activeIndex === 0 ? 0.4 : 1,
              zIndex: 2,
            }}
          >
            ›
          </button>
          <button
            onClick={goNext}
            disabled={activeIndex === block.images.length - 1}
            aria-label="الصورة التالية"
            style={{
              position: 'absolute',
              top: '50%',
              insetInlineStart: '0.75rem',
              transform: 'translateY(-50%)',
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '50%',
              background: 'rgba(24,59,78,0.75)',
              border: '1px solid rgba(221,168,83,0.4)',
              color: '#DDA853',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: activeIndex === block.images.length - 1 ? 'not-allowed' : 'pointer',
              opacity: activeIndex === block.images.length - 1 ? 0.4 : 1,
              zIndex: 2,
            }}
          >
            ‹
          </button>
        </>
      )}

      {/* Dot navigation */}
      {block.images.length > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '0.5rem',
            marginBlockStart: '0.75rem',
          }}
          role="tablist"
          aria-label="صور المقال"
        >
          {block.images.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`صورة ${i + 1}`}
              onClick={() => scrollTo(i)}
              style={{
                width: i === activeIndex ? '1.5rem' : '0.5rem',
                height: '0.5rem',
                borderRadius: '9999px',
                background: i === activeIndex ? '#DDA853' : 'rgba(24,59,78,0.25)',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.2s ease',
              }}
            />
          ))}
        </div>
      )}
    </figure>
  )
}
