import type { SidebarBlock } from '@/types'

interface Props {
  block: SidebarBlock
}

type ThemeConfig = {
  background: string
  color: string
  border?: string
}

const THEMES: Record<NonNullable<SidebarBlock['theme']>, ThemeConfig> = {
  gold: {
    background: '#DDA853',
    color: '#183B4E',
  },
  navy: {
    background: '#183B4E',
    color: '#F5EEDC',
    border: '1px solid #DDA853',
  },
  cream: {
    background: '#F5EEDC',
    color: '#183B4E',
    border: '1px solid #DDA853',
  },
}

/**
 * SidebarBlock — Floating aside box with gold/navy/cream themes.
 *
 * RTL float: float inline-start = LEFT side in RTL (so body text flows on the right).
 * margin-inline-end creates space between the box and the flowing body text.
 *
 * The 'float' field on the block can override to 'end' (floats RIGHT in RTL).
 */
export function SidebarBlock({ block }: Props) {
  const theme = THEMES[block.theme ?? 'cream']
  const floatDir = block.float === 'end' ? 'inline-end' : 'inline-start'

  return (
    <aside
      dir="rtl"
      style={{
        float: floatDir,
        width: '35%',
        marginInlineEnd: floatDir === 'inline-start' ? '1.5rem' : '0',
        marginInlineStart: floatDir === 'inline-end' ? '1.5rem' : '0',
        marginBlockStart: '0.5rem',
        marginBlockEnd: '1rem',
        padding: '1.25rem',
        borderRadius: '0.5rem',
        background: theme.background,
        color: theme.color,
        border: theme.border,
        boxSizing: 'border-box',
      }}
      className="magazine-sidebar"
    >
      {block.title && (
        <p
          style={{
            fontFamily: "var(--font-body, 'Tajawal', sans-serif)",
            fontWeight: 700,
            fontSize: '1rem',
            marginBlockEnd: '0.625rem',
            marginBlockStart: 0,
            lineHeight: 1.4,
            color: 'inherit',
          }}
        >
          {block.title}
        </p>
      )}
      <div
        style={{
          fontFamily: "var(--font-body, 'Tajawal', sans-serif)",
          fontSize: '0.9rem',
          lineHeight: 1.7,
          color: 'inherit',
        }}
        dangerouslySetInnerHTML={{ __html: block.body }}
      />
    </aside>
  )
}
