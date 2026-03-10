import type { CalloutBlock } from '@/types'

interface Props {
  block: CalloutBlock
}

type VariantConfig = {
  background: string
  border?: string
  color: string
  icon?: string
}

const VARIANTS: Record<NonNullable<CalloutBlock['variant']>, VariantConfig> = {
  stat: {
    background: 'transparent',
    color: '#183B4E',
  },
  info: {
    background: 'rgba(39, 84, 138, 0.06)',
    border: '1px solid rgba(39, 84, 138, 0.2)',
    color: '#183B4E',
    icon: 'ℹ',
  },
  quote: {
    background: '#F5EEDC',
    border: '1px solid rgba(221, 168, 83, 0.3)',
    color: '#183B4E',
  },
  warning: {
    background: 'rgba(221, 168, 83, 0.1)',
    border: '1px solid rgba(221, 168, 83, 0.4)',
    color: '#183B4E',
    icon: '⚠',
  },
}

/**
 * CalloutBlock — Styled callout boxes for stats, info, quotes, and warnings.
 *
 * stat:    Huge gold number (clamp 3–6rem Playfair Display) + unit + body text
 * info:    Blue-tinted box with ℹ icon
 * quote:   Centered guillemet «» quote, no attribution (distinct from PullQuote)
 * warning: Amber-tinted box with ⚠ icon
 */
export function CalloutBlock({ block }: Props) {
  const variant = VARIANTS[block.variant]

  if (block.variant === 'stat') {
    return (
      <div
        dir="rtl"
        style={{
          marginBlockStart: '2em',
          marginBlockEnd: '2em',
          padding: '1.5rem',
          borderRadius: '0.75rem',
          textAlign: 'center',
          background: '#F5EEDC',
          border: '1px solid rgba(221, 168, 83, 0.2)',
        }}
        className="magazine-callout magazine-callout--stat"
      >
        {block.value && (
          <div
            style={{
              fontFamily: "var(--font-accent, 'Playfair Display', serif)",
              fontSize: 'clamp(3rem, 8vw, 6rem)',
              fontWeight: 700,
              color: '#DDA853',
              lineHeight: 1,
              marginBlockEnd: '0.25rem',
            }}
          >
            {block.value}
          </div>
        )}
        {block.label && (
          <div
            style={{
              fontFamily: "var(--font-body, 'Tajawal', sans-serif)",
              fontSize: '1rem',
              color: '#27548A',
              fontWeight: 600,
              marginBlockEnd: '0.75rem',
            }}
          >
            {block.label}
          </div>
        )}
        {block.body && (
          <div
            style={{
              fontFamily: "var(--font-body, 'Tajawal', sans-serif)",
              fontSize: '0.9rem',
              color: '#183B4E',
              lineHeight: 1.7,
              opacity: 0.8,
            }}
          >
            {block.body}
          </div>
        )}
      </div>
    )
  }

  if (block.variant === 'quote') {
    return (
      <div
        dir="rtl"
        style={{
          marginBlockStart: '2em',
          marginBlockEnd: '2em',
          padding: '2rem 1.5rem',
          borderRadius: '0.75rem',
          textAlign: 'center',
          background: variant.background,
          border: variant.border,
        }}
        className="magazine-callout magazine-callout--quote"
      >
        <div
          style={{
            fontFamily: "var(--font-body, 'Tajawal', sans-serif)",
            fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
            fontStyle: 'italic',
            color: '#27548A',
            lineHeight: 1.7,
          }}
        >
          «{block.body ?? block.value}»
        </div>
      </div>
    )
  }

  // info + warning: boxed with icon
  return (
    <div
      dir="rtl"
      style={{
        marginBlockStart: '2em',
        marginBlockEnd: '2em',
        padding: '1.5rem',
        borderRadius: '0.75rem',
        background: variant.background,
        border: variant.border,
        display: 'flex',
        gap: '1rem',
        alignItems: 'flex-start',
      }}
      className={`magazine-callout magazine-callout--${block.variant}`}
    >
      {variant.icon && (
        <span
          style={{
            fontSize: '1.25rem',
            flexShrink: 0,
            marginBlockStart: '0.1rem',
            color: block.variant === 'warning' ? '#DDA853' : '#27548A',
          }}
          aria-hidden="true"
        >
          {variant.icon}
        </span>
      )}
      <div
        style={{
          fontFamily: "var(--font-body, 'Tajawal', sans-serif)",
          fontSize: '0.95rem',
          color: variant.color,
          lineHeight: 1.7,
          flex: 1,
        }}
      >
        {block.body ?? block.value}
      </div>
    </div>
  )
}
