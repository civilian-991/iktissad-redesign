/**
 * PullQuoteExtension — TipTap custom node for editorial pull quotes
 * Renders a gold-bordered quote block with attribution field.
 * Stored as TipTap JSON; rendered via PullQuoteNodeView in the editor.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { PullQuoteNodeView } from './views/PullQuoteNodeView'

export const PullQuoteExtension = Node.create({
  name: 'pullQuote',

  group: 'block',

  content: 'inline*',

  addAttributes() {
    return {
      attribution: { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'blockquote.pull-quote' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['blockquote', mergeAttributes({ class: 'pull-quote' }, HTMLAttributes), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(PullQuoteNodeView)
  },

  addCommands() {
    return {
      insertPullQuote:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { attribution: '' },
            content: [{ type: 'text', text: 'اكتب الاقتباس هنا...' }],
          })
        },
    }
  },
})

// Extend TipTap Commands type
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pullQuote: {
      insertPullQuote: () => ReturnType
    }
  }
}
