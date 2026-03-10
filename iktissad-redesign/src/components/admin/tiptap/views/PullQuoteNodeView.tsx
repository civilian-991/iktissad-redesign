/**
 * PullQuoteNodeView — React NodeView for PullQuoteExtension.
 * Shows: gold right border, guillemet «, editable quote text, attribution input.
 * Design tokens: #183B4E obsidian, #DDA853 gold, #F5EEDC cream.
 */

import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'

export function PullQuoteNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const attribution = node.attrs.attribution as string

  return (
    <NodeViewWrapper
      as="blockquote"
      className="pull-quote"
      style={{
        borderInlineStart: '4px solid #DDA853',
        paddingInlineStart: '1.25rem',
        paddingBlock: '0.75rem',
        margin: '1.5rem 0',
        background: 'rgba(221,168,83,0.06)',
        borderRadius: '0 0.5rem 0.5rem 0',
        outline: selected ? '2px solid #DDA853' : 'none',
        outlineOffset: '2px',
      }}
    >
      {/* Guillemet ornament */}
      <span
        aria-hidden="true"
        style={{
          display: 'block',
          fontSize: '2rem',
          color: '#DDA853',
          lineHeight: 1,
          marginBottom: '0.25rem',
          fontFamily: 'serif',
          userSelect: 'none',
        }}
      >
        «
      </span>

      {/* Editable quote text */}
      <NodeViewContent
        style={{
          fontSize: '1.2rem',
          fontWeight: 600,
          color: '#F5EEDC',
          fontStyle: 'italic',
          margin: '0 0 0.75rem',
          lineHeight: 1.6,
        }}
      />

      {/* Attribution input */}
      <input
        type="text"
        value={attribution}
        onChange={(e) => updateAttributes({ attribution: e.target.value })}
        placeholder="المصدر / الاقتباس من..."
        style={{
          display: 'block',
          width: '100%',
          background: 'transparent',
          border: 'none',
          borderTop: '1px solid rgba(221,168,83,0.2)',
          paddingTop: '0.5rem',
          color: 'rgba(245,238,220,0.6)',
          fontSize: '0.875rem',
          outline: 'none',
          cursor: 'text',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      />
    </NodeViewWrapper>
  )
}
