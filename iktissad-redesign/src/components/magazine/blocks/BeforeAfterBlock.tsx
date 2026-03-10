'use client'

import { useState } from 'react'
import NextImage from 'next/image'
import type { BeforeAfterBlock } from '@/types'

interface Props {
  block: BeforeAfterBlock
}

/**
 * BeforeAfterBlock — Comparison slider using clip-path to reveal before/after images.
 *
 * Implementation:
 * - Container: position relative, overflow hidden, fixed height
 * - After image: absolute, full size, base layer (shown underneath)
 * - Before image: absolute, full size, clip-path: inset(0 {100-value}% 0 0)
 *   This clips from the right side (RTL inline-end) revealing after image as you drag
 * - Range input: positioned over both images as the drag handle
 * - Labels: "قبل" and "بعد" float over respective sides
 */
export function BeforeAfterBlock({ block }: Props) {
  const [sliderValue, setSliderValue] = useState(50)

  // clip-path reveals "before" on the right side (RTL start = right)
  // inset(top right bottom left) — right = 100-value means: clip off the left part
  const beforeClip = `inset(0 ${100 - sliderValue}% 0 0)`

  return (
    <figure
      dir="rtl"
      style={{ marginBlockStart: '2em', marginBlockEnd: '2em', marginInline: 0 }}
      className="magazine-before-after"
    >
      {/* Image container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '400px',
          overflow: 'hidden',
          borderRadius: '0.25rem',
          userSelect: 'none',
        }}
      >
        {/* After image — base layer */}
        <NextImage
          src={block.afterSrc}
          alt={block.afterLabel ?? 'بعد'}
          fill
          sizes="100vw"
          style={{ objectFit: 'cover', position: 'absolute' }}
        />

        {/* Before image — clipped layer */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            clipPath: beforeClip,
            transition: 'clip-path 0.0s',
          }}
        >
          <NextImage
            src={block.beforeSrc}
            alt={block.beforeLabel ?? 'قبل'}
            fill
            sizes="100vw"
            style={{ objectFit: 'cover' }}
          />
        </div>

        {/* Labels */}
        <span
          style={{
            position: 'absolute',
            top: '1rem',
            insetInlineEnd: '1rem',
            background: 'rgba(24,59,78,0.8)',
            color: '#F5EEDC',
            fontFamily: "var(--font-body, 'Tajawal', sans-serif)",
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '0.25rem 0.625rem',
            borderRadius: '0.25rem',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        >
          {block.beforeLabel ?? 'قبل'}
        </span>
        <span
          style={{
            position: 'absolute',
            top: '1rem',
            insetInlineStart: '1rem',
            background: 'rgba(221,168,83,0.9)',
            color: '#183B4E',
            fontFamily: "var(--font-body, 'Tajawal', sans-serif)",
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '0.25rem 0.625rem',
            borderRadius: '0.25rem',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        >
          {block.afterLabel ?? 'بعد'}
        </span>

        {/* Divider line at slider position */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${sliderValue}%`,
            width: '2px',
            background: '#DDA853',
            zIndex: 3,
            pointerEvents: 'none',
            transform: 'translateX(-50%)',
          }}
        />

        {/* Range input */}
        <input
          type="range"
          min={0}
          max={100}
          value={sliderValue}
          onChange={e => setSliderValue(Number(e.target.value))}
          aria-label="تحريك مقارنة الصور"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'ew-resize',
            zIndex: 4,
            margin: 0,
            padding: 0,
          }}
        />
      </div>

      {/* Caption */}
      {block.caption && (
        <figcaption
          style={{
            fontFamily: "var(--font-body, 'Tajawal', sans-serif)",
            fontSize: '0.85rem',
            color: '#555',
            marginBlockStart: '0.5rem',
            fontStyle: 'italic',
          }}
        >
          {block.caption}
        </figcaption>
      )}
    </figure>
  )
}
