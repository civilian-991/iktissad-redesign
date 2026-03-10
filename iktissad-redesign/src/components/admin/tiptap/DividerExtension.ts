/**
 * DividerExtension — TipTap custom node for ornamental section dividers.
 * No content (leaf node). Renders an <hr> with class 'ornamental'.
 * No NodeView needed — pure HTML rendering.
 */

import { Node, mergeAttributes } from '@tiptap/core'

export const DividerExtension = Node.create({
  name: 'ornamentalDivider',

  group: 'block',

  atom: true,

  parseHTML() {
    return [{ tag: 'hr.ornamental' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['hr', mergeAttributes({ class: 'ornamental' }, HTMLAttributes)]
  },

  addCommands() {
    return {
      insertOrnamentalDivider:
        () =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name })
        },
    }
  },
})

// Extend TipTap Commands type
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    ornamentalDivider: {
      insertOrnamentalDivider: () => ReturnType
    }
  }
}
