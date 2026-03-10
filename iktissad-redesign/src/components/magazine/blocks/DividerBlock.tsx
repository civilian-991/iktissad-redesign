import type { DividerBlock } from '@/types'

interface Props {
  block: DividerBlock
}

/**
 * DividerBlock — Ornamental separator between article sections.
 *
 * Styles:
 *  - ornament (default): gold lines flanking a centered ◆ diamond
 *  - line:               simple single gold line
 *  - space:              vertical whitespace only (no visual element)
 */
export function DividerBlock({ block }: Props) {
  const style = block.style ?? 'ornament'

  if (style === 'space') {
    return (
      <div
        style={{ marginBlockStart: '3em', marginBlockEnd: '3em' }}
        role="separator"
        aria-hidden="true"
      />
    )
  }

  if (style === 'line') {
    return (
      <hr
        style={{
          marginBlockStart: '2em',
          marginBlockEnd: '2em',
          border: 'none',
          borderTop: '1px solid rgba(221, 168, 83, 0.5)',
        }}
        aria-hidden="true"
      />
    )
  }

  // Default: ornament
  return (
    <div
      role="separator"
      aria-hidden="true"
      style={{
        display: 'flex',
        alignItems: 'center',
        marginBlockStart: '2em',
        marginBlockEnd: '2em',
      }}
      className="magazine-divider"
    >
      <span
        style={{
          flexGrow: 1,
          height: '1px',
          background: '#DDA853',
          opacity: 0.5,
        }}
      />
      <span
        style={{
          color: '#DDA853',
          paddingInlineStart: '1rem',
          paddingInlineEnd: '1rem',
          fontSize: '0.75rem',
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        ◆
      </span>
      <span
        style={{
          flexGrow: 1,
          height: '1px',
          background: '#DDA853',
          opacity: 0.5,
        }}
      />
    </div>
  )
}
