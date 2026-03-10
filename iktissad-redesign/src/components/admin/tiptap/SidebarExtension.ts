/**
 * SidebarExtension — TipTap custom node for floating aside blocks.
 * Attrs: title, theme ('gold'|'navy'|'cream')
 * Content: paragraph+
 * Rendered via SidebarNodeView with theme selector.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { SidebarNodeView } from './views/SidebarNodeView'

export const SidebarExtension = Node.create({
  name: 'sidebar',

  group: 'block',

  content: 'paragraph+',

  addAttributes() {
    return {
      title: { default: '' },
      theme: { default: 'gold' },
    }
  },

  parseHTML() {
    return [{ tag: 'aside[data-type="sidebar"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'aside',
      mergeAttributes(
        {
          'data-type': 'sidebar',
          'data-theme': HTMLAttributes.theme,
          class: `sidebar-block sidebar-${HTMLAttributes.theme}`,
        },
        HTMLAttributes
      ),
      0,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(SidebarNodeView)
  },

  addCommands() {
    return {
      insertSidebar:
        (attrs?: { title?: string; theme?: 'gold' | 'navy' | 'cream' }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              title: attrs?.title ?? 'معلومة جانبية',
              theme: attrs?.theme ?? 'gold',
            },
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'اكتب المحتوى الجانبي هنا...' }],
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
    sidebar: {
      insertSidebar: (attrs?: { title?: string; theme?: 'gold' | 'navy' | 'cream' }) => ReturnType
    }
  }
}
