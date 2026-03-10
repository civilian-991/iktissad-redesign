/**
 * CalloutNodeView — React NodeView for CalloutExtension.
 * Renders a styled callout box with style selector (stat/info/quote/warning).
 * Stat style shows value + unit prominently.
 * Design tokens: #183B4E obsidian, #DDA853 gold, #F5EEDC cream.
 */

import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'

type CalloutStyle = 'stat' | 'info' | 'quote' | 'warning'

const STYLE_OPTIONS: { value: CalloutStyle; label: string; icon: string; bg: string; border: string; accent: string }[] = [
  { value: 'stat', label: 'إحصاء', icon: '📊', bg: 'rgba(221,168,83,0.08)', border: '#DDA853', accent: '#DDA853' },
  { value: 'info', label: 'معلومة', icon: 'ℹ️', bg: 'rgba(39,84,138,0.15)', border: '#27548A', accent: '#7BAFD4' },
  { value: 'quote', label: 'اقتباس', icon: '💬', bg: 'rgba(245,238,220,0.05)', border: 'rgba(245,238,220,0.3)', accent: '#F5EEDC' },
  { value: 'warning', label: 'تنبيه', icon: '⚠️', bg: 'rgba(239,68,68,0.08)', border: '#ef4444', accent: '#fca5a5' },
]

export function CalloutNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const calloutStyle = (node.attrs.style as CalloutStyle) ?? 'info'
  const value = node.attrs.value as string
  const unit = node.attrs.unit as string

  const styleConfig = STYLE_OPTIONS.find((s) => s.value === calloutStyle) ?? STYLE_OPTIONS[1]

  return (
    <NodeViewWrapper
      as="div"
      data-type="callout"
      data-style={calloutStyle}
      style={{
        display: 'block',
        border: `1px solid ${styleConfig.border}`,
        borderRadius: '0.75rem',
        padding: '1rem 1.25rem',
        marginBlock: '1.5rem',
        background: styleConfig.bg,
        outline: selected ? `2px solid ${styleConfig.border}` : 'none',
        outlineOffset: '2px',
      }}
    >
      {/* Style selector row */}
      <div
        style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.75rem', alignItems: 'center' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {STYLE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => updateAttributes({ style: opt.value })}
            title={opt.label}
            style={{
              padding: '0.2rem 0.5rem',
              borderRadius: '0.25rem',
              fontSize: '0.7rem',
              border: `1px solid ${opt.border}`,
              cursor: 'pointer',
              background: calloutStyle === opt.value ? opt.border : 'transparent',
              color: calloutStyle === opt.value ? '#183B4E' : opt.accent,
            }}
          >
            {opt.icon} {opt.label}
          </button>
        ))}
      </div>

      {/* Stat display (only for stat style) */}
      {calloutStyle === 'stat' && (
        <div
          style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline', marginBottom: '0.5rem' }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={value}
            onChange={(e) => updateAttributes({ value: e.target.value })}
            placeholder="القيمة..."
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${styleConfig.accent}`,
              color: styleConfig.accent,
              fontSize: '2.5rem',
              fontWeight: 800,
              outline: 'none',
              width: '8rem',
              textAlign: 'center',
            }}
          />
          <input
            type="text"
            value={unit}
            onChange={(e) => updateAttributes({ unit: e.target.value })}
            placeholder="الوحدة..."
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: `1px solid ${styleConfig.accent}80`,
              color: `${styleConfig.accent}cc`,
              fontSize: '1.125rem',
              fontWeight: 600,
              outline: 'none',
              width: '6rem',
            }}
          />
        </div>
      )}

      {/* Editable body */}
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
