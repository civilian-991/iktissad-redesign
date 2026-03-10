/**
 * FigureExtension — TipTap custom node for images with caption, credit, and focal point.
 * Attrs: src, alt, caption, credit, focalX, focalY, width ('full'|'half'|'third')
 * Rendered via FigureNodeView with focal-point UI.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { FigureNodeView } from './views/FigureNodeView'

export const FigureExtension = Node.create({
  name: 'figure',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      src: { default: '' },
      alt: { default: '' },
      caption: { default: '' },
      credit: { default: '' },
      focalX: { default: 0.5 },
      focalY: { default: 0.5 },
      width: { default: 'full' },
    }
  },

  parseHTML() {
    return [{ tag: 'figure[data-type="figure"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'figure',
      mergeAttributes({ 'data-type': 'figure' }, HTMLAttributes),
      [
        'img',
        {
          src: HTMLAttributes.src,
          alt: HTMLAttributes.alt,
          style: `object-position: ${(HTMLAttributes.focalX ?? 0.5) * 100}% ${(HTMLAttributes.focalY ?? 0.5) * 100}%`,
        },
      ],
      HTMLAttributes.caption ? ['figcaption', {}, HTMLAttributes.caption] : ['span'],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(FigureNodeView)
  },

  addCommands() {
    return {
      insertFigure:
        (attrs: { src: string; alt?: string; caption?: string; credit?: string }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              src: attrs.src,
              alt: attrs.alt ?? '',
              caption: attrs.caption ?? '',
              credit: attrs.credit ?? '',
              focalX: 0.5,
              focalY: 0.5,
              width: 'full',
            },
          })
        },
    }
  },
})

// Extend TipTap Commands type
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    figure: {
      insertFigure: (attrs: {
        src: string
        alt?: string
        caption?: string
        credit?: string
      }) => ReturnType
    }
  }
}
