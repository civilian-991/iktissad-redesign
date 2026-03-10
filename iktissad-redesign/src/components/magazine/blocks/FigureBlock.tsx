import NextImage from 'next/image'
import type { FigureBlock } from '@/types'

interface Props {
  block: FigureBlock
}

/**
 * FigureBlock — Magazine image with focal-point cropping, caption, and credit.
 *
 * Sizes:
 *  - normal: full column width (default)
 *  - wide:   full column width, taller aspect ratio
 *  - full:   breaks out of column, 100% viewport width treatment
 *
 * Focal point (focalX, focalY: 0-1) maps to CSS object-position %.
 * Uses next/image for optimization.
 */
export function FigureBlock({ block }: Props) {
  const focalX = (block.focalX ?? 0.5) * 100
  const focalY = (block.focalY ?? 0.5) * 100
  const objectPosition = `${focalX}% ${focalY}%`

  const heightBySize: Record<string, string> = {
    normal: '400px',
    wide: '520px',
    full: '560px',
  }
  const height = heightBySize[block.size ?? 'normal'] ?? '400px'

  const isFloated = block.size === 'normal' // normal = half-column float for variety?
  // Per spec: full = w-full, normal/wide = full column width
  // We keep all sizes full width but vary height

  return (
    <figure
      dir="rtl"
      style={{
        marginBlockStart: '2em',
        marginBlockEnd: '2em',
        marginInlineStart: 0,
        marginInlineEnd: 0,
        clear: 'both',
        width: '100%',
      }}
      className="magazine-figure"
    >
      {/* Image wrapper — relative for next/image fill */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height,
          overflow: 'hidden',
        }}
      >
        <NextImage
          src={block.src}
          alt={block.alt}
          fill
          sizes="(max-width: 768px) 100vw, 75vw"
          style={{
            objectFit: 'cover',
            objectPosition,
          }}
        />
      </div>

      {/* Caption + Credit */}
      {(block.caption || block.credit) && (
        <figcaption
          style={{
            marginBlockStart: '0.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1rem',
          }}
        >
          {block.caption && (
            <span
              style={{
                fontFamily: "var(--font-body, 'Tajawal', sans-serif)",
                fontSize: '0.85rem',
                fontStyle: 'italic',
                color: '#555',
                lineHeight: 1.5,
                flex: 1,
              }}
            >
              {block.caption}
            </span>
          )}
          {block.credit && (
            <span
              style={{
                fontFamily: "var(--font-body, 'Tajawal', sans-serif)",
                fontSize: '0.75rem',
                color: '#DDA853',
                fontStyle: 'normal',
                fontWeight: 600,
                flexShrink: 0,
                textAlign: 'end',
              }}
            >
              {block.credit}
            </span>
          )}
        </figcaption>
      )}
    </figure>
  )
}
