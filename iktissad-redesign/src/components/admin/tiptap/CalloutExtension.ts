/**
 * CalloutExtension — TipTap custom node for stat/info/quote/warning callout boxes.
 * Attrs: style ('stat'|'info'|'quote'|'warning'), value, unit
 * Content: paragraph+
 * Rendered via CalloutNodeView with appropriate styling.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { CalloutNodeView } from './views/CalloutNodeView'

export const CalloutExtension = Node.create({
  name: 'callout',

  group: 'block',

  content: 'paragraph+',

  addAttributes() {
    return {
      style: { default: 'info' },
      value: { default: '' },
      unit: { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        {
          'data-type': 'callout',
          'data-style': HTMLAttributes.style,
          class: `callout-block callout-${HTMLAttributes.style}`,
        },
        HTMLAttributes
      ),
      0,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutNodeView)
  },

  addCommands() {
    return {
      insertCallout:
        (attrs?: { style?: 'stat' | 'info' | 'quote' | 'warning'; value?: string; unit?: string }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              style: attrs?.style ?? 'info',
              value: attrs?.value ?? '',
              unit: attrs?.unit ?? '',
            },
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'اكتب المحتوى هنا...' }],
              },
            ],
          })
        },
    }
  },
})

// Extend TipTap Commands type
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      insertCallout: (attrs?: {
        style?: 'stat' | 'info' | 'quote' | 'warning'
        value?: string
        unit?: string
      }) => ReturnType
    }
  }
}
