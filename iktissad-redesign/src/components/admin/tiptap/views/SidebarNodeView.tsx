/**
 * SidebarNodeView — React NodeView for SidebarExtension.
 * Shows title input, theme selector (gold/navy/cream), and editable content area.
 * Design tokens: #183B4E obsidian, #DDA853 gold, #F5EEDC cream, #27548A navy.
 */

import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'

type SidebarTheme = 'gold' | 'navy' | 'cream'

const THEME_OPTIONS: { value: SidebarTheme; label: string; bg: string; border: string; text: string }[] = [
  { value: 'gold', label: 'ذهبي', bg: 'rgba(221,168,83,0.08)', border: '#DDA853', text: '#DDA853' },
  { value: 'navy', label: 'كحلي', bg: 'rgba(39,84,138,0.2)', border: '#27548A', text: '#7BAFD4' },
  { value: 'cream', label: 'كريمي', bg: 'rgba(245,238,220,0.08)', border: 'rgba(245,238,220,0.4)', text: '#F5EEDC' },
]

export function SidebarNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const title = node.attrs.title as string
  const theme = (node.attrs.theme as SidebarTheme) ?? 'gold'

  const themeConfig = THEME_OPTIONS.find((t) => t.value === theme) ?? THEME_OPTIONS[0]

  return (
    <NodeViewWrapper
      as="aside"
      data-type="sidebar"
      data-theme={theme}
      style={{
        display: 'block',
        borderInlineStart: `3px solid ${themeConfig.border}`,
        paddingInlineStart: '1rem',
        paddingBlock: '0.875rem',
        marginBlock: '1.5rem',
        background: themeConfig.bg,
        borderRadius: '0 0.5rem 0.5rem 0',
        outline: selected ? `2px solid ${themeConfig.border}` : 'none',
        outlineOffset: '3px',
      }}
    >
      {/* Title input */}
      <input
        type="text"
        value={title}
        onChange={(e) => updateAttributes({ title: e.target.value })}
        placeholder="عنوان الصندوق الجانبي..."
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          display: 'block',
          width: '100%',
          background: 'transparent',
          border: 'none',
          borderBottom: `1px solid ${themeConfig.border}40`,
          paddingBottom: '0.375rem',
          marginBottom: '0.625rem',
          color: themeConfig.text,
          fontSize: '0.875rem',
          fontWeight: 700,
          outline: 'none',
        }}
      />

      {/* Theme selector */}
      <div
        style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.75rem' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {THEME_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => updateAttributes({ theme: opt.value })}
            style={{
              padding: '0.2rem 0.5rem',
              borderRadius: '0.25rem',
              fontSize: '0.7rem',
              border: `1px solid ${opt.border}`,
              cursor: 'pointer',
              background: theme === opt.value ? opt.border : 'transparent',
              color: theme === opt.value ? '#183B4E' : opt.text,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Editable content */}
      <NodeViewContent
        style={{
          color: 'rgba(245,238,220,0.85)',
          fontSize: '0.9375rem',
          lineHeight: 1.65,
        }}
      />
    </NodeViewWrapper>
  )
}
