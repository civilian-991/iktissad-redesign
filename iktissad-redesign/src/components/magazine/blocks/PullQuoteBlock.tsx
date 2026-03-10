import type { PullQuoteBlock } from '@/types'

interface Props {
  block: PullQuoteBlock
}

/**
 * PullQuoteBlock — RTL-aware floating pull quote with Arabic typographic conventions.
 *
 * RTL conventions (critical):
 * - border-inline-start = RIGHT side in RTL (reading direction start)
 * - float: inline-start = floats to the LEFT in RTL (opposite to LTR instinct)
 * - margin-inline-end = space to the RIGHT of the float, pushing body text away
 * - Guillemets «» are used (Arabic quotation marks, not English " ")
 *
 * The float leaves space for body text to flow around on the right (inline-end) side.
 */
export function PullQuoteBlock({ block }: Props) {
  return (
    <figure
      dir="rtl"
      style={{
        float: 'inline-start',
        width: '40%',
        marginInlineEnd: '1.5rem',
        marginInlineStart: '0',
        marginBlockStart: '0.5rem',
        marginBlockEnd: '1rem',
        borderInlineStart: '4px solid #DDA853',
        paddingInlineStart: '1.5rem',
        paddingBlockStart: '0.5rem',
        paddingBlockEnd: '0.5rem',
      }}
      className="magazine-pull-quote"
    >
      <blockquote
        style={{
          fontFamily: "var(--font-body, 'Tajawal', sans-serif)",
          fontSize: '1.25rem',
          fontStyle: 'italic',
          lineHeight: '1.7',
          color: '#27548A',
          margin: 0,
          padding: 0,
        }}
      >
        «{block.text}»
      </blockquote>

      {block.attribution && (
        <figcaption
          style={{
            fontFamily: "var(--font-body, 'Tajawal', sans-serif)",
            fontSize: '0.8rem',
            color: '#DDA853',
            marginBlockStart: '0.75rem',
            textAlign: 'end',
            fontStyle: 'normal',
            fontWeight: 600,
          }}
        >
          — {block.attribution}
        </figcaption>
      )}
    </figure>
  )
}
