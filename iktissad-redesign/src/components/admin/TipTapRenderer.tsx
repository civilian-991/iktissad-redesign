'use client'

import React from 'react'
import type { JSONContent } from '@tiptap/core'

export interface TipTapRendererProps {
  content: JSONContent | string | null
  className?: string
}

// ---------------------------------------------------------------------------
// Mark rendering helpers
// ---------------------------------------------------------------------------

interface Mark {
  type: string
  attrs?: Record<string, unknown>
}

function applyMarks(text: string, marks: Mark[], keyPrefix: string): React.ReactNode {
  if (!marks || marks.length === 0) return text

  // Apply marks from outermost to innermost (last in array = innermost)
  return marks.reduceRight<React.ReactNode>((children, mark, idx) => {
    const key = `${keyPrefix}-mark-${idx}`
    switch (mark.type) {
      case 'bold':
        return <strong key={key}>{children}</strong>
      case 'italic':
        return <em key={key}>{children}</em>
      case 'underline':
        return <u key={key}>{children}</u>
      case 'strike':
        return <s key={key}>{children}</s>
      case 'code':
        return (
          <code key={key} className="px-1.5 py-0.5 rounded text-sm" style={{ backgroundColor: CODE_FILL, fontFamily: 'monospace' }}>
            {children}
          </code>
        )
      case 'link': {
        const href = (mark.attrs?.href as string) ?? '#'
        const target = (mark.attrs?.target as string) ?? '_blank'
        return (
          <a
            key={key}
            href={href}
            target={target}
            rel="noopener noreferrer"
            className="underline transition-opacity hover:opacity-80"
            style={{ color: 'var(--color-gold)' }}
          >
            {children}
          </a>
        )
      }
      default:
        return <React.Fragment key={key}>{children}</React.Fragment>
    }
  }, text)
}

// ---------------------------------------------------------------------------
// Recursive node renderer
// ---------------------------------------------------------------------------

// TipTap's TextAlign extension stores alignment as a `textAlign` node attribute
// ('left' | 'center' | 'right' | 'justify'). The editor renders it; the published
// view must too, or centered/aligned text silently reverts to the default.
function alignStyle(node: JSONContent): React.CSSProperties | undefined {
  const a = node.attrs?.textAlign as string | undefined
  return a && a !== 'start' ? { textAlign: a as React.CSSProperties['textAlign'] } : undefined
}

// Theme-neutral surfaces derived from the inherited text color (currentColor).
// This makes tables, code blocks and headings render correctly on BOTH the light
// public article page (ink text) and the dark admin preview (light text), instead
// of the hardcoded dark zinc/white that only suited the editor.
const SUBTLE_BORDER = 'color-mix(in srgb, currentColor 22%, transparent)'
const SUBTLE_FILL = 'color-mix(in srgb, currentColor 7%, transparent)'
const CODE_FILL = 'color-mix(in srgb, currentColor 10%, transparent)'

function renderNode(node: JSONContent, keyPrefix = 'n'): React.ReactNode {
  if (!node) return null

  // Text node
  if (node.type === 'text') {
    const text = node.text ?? ''
    const marks = (node.marks ?? []) as Mark[]
    if (marks.length === 0) return text
    return applyMarks(text, marks, keyPrefix)
  }

  const children = node.content
    ? node.content.map((child, i) => renderNode(child, `${keyPrefix}-${i}`))
    : []

  switch (node.type) {
    case 'doc':
      return <>{children}</>

    case 'paragraph':
      return (
        <p key={keyPrefix} dir="rtl" style={alignStyle(node)} className="mb-4 text-zinc-200 leading-relaxed text-base">
          {children.length > 0 ? children : <br />}
        </p>
      )

    case 'heading': {
      const level = (node.attrs?.level as number) ?? 2
      const style = alignStyle(node)
      if (level === 1) {
        return (
          <h1 key={keyPrefix} dir="rtl" style={style} className="text-3xl font-bold mb-4 mt-8 font-serif">
            {children}
          </h1>
        )
      }
      if (level === 2) {
        return (
          <h2 key={keyPrefix} dir="rtl" style={{ ...style, borderBottom: `1px solid ${SUBTLE_BORDER}` }} className="text-2xl font-bold mb-3 mt-6 pb-2">
            {children}
          </h2>
        )
      }
      // level 3+
      return (
        <h3 key={keyPrefix} dir="rtl" style={style} className="text-xl font-semibold mb-2 mt-4">
          {children}
        </h3>
      )
    }

    case 'bulletList':
      return (
        <ul key={keyPrefix} dir="rtl" className="list-disc list-inside space-y-1 mb-4 ps-4 text-zinc-200">
          {children}
        </ul>
      )

    case 'orderedList':
      return (
        <ol key={keyPrefix} dir="rtl" className="list-decimal list-inside space-y-1 mb-4 ps-4 text-zinc-200">
          {children}
        </ol>
      )

    case 'listItem':
      return (
        <li key={keyPrefix} dir="rtl">
          {children}
        </li>
      )

    case 'blockquote':
      return (
        <blockquote
          key={keyPrefix}
          dir="rtl"
          className="my-6 ps-6 pe-2 text-zinc-200 italic text-xl font-[family-name:var(--font-accent)] leading-relaxed"
        >
          {children}
        </blockquote>
      )

    case 'codeBlock':
      return (
        <pre key={keyPrefix} className="rounded-lg p-4 my-4 overflow-x-auto" style={{ backgroundColor: CODE_FILL }}>
          <code className="text-sm font-mono">{children}</code>
        </pre>
      )

    case 'horizontalRule':
      return <hr key={keyPrefix} className="border-zinc-700 my-6" />

    case 'hardBreak':
      return <br key={keyPrefix} />

    case 'image': {
      const src = (node.attrs?.src as string) ?? ''
      const alt = (node.attrs?.alt as string) ?? ''
      const title = (node.attrs?.title as string) ?? undefined
      // Center block images (match the editor). Use INLINE styles, not Tailwind
      // utilities: the centering class is built dynamically here, so Tailwind's
      // content scanner doesn't emit a `.mx-auto` rule and class-based centering
      // silently no-ops in production. Honor an explicit alignment if set.
      const align = node.attrs?.textAlign as string | undefined
      const imgStyle: React.CSSProperties = {
        display: 'block',
        maxWidth: '100%',
        height: 'auto',
        marginTop: '1rem',
        marginBottom: '1rem',
        marginLeft: align === 'left' ? 0 : 'auto',
        marginRight: align === 'right' ? 0 : 'auto',
      }
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={keyPrefix}
          src={src}
          alt={alt}
          title={title}
          style={imgStyle}
          className="rounded-lg"
        />
      )
    }

    case 'table':
      // Scroll wide tables horizontally inside the article column instead of
      // overflowing the page on mobile. Inline styles (not Tailwind utilities)
      // because the class scanner doesn't reliably emit them for this route, and
      // `max-width:100%` needs a width-constrained ancestor — see the `min-w-0`
      // on the article column in [slug]/PageClient.tsx.
      return (
        <div
          key={keyPrefix}
          style={{ overflowX: 'auto', maxWidth: '100%', marginTop: '1rem', marginBottom: '1rem' }}
        >
          <table className="border-collapse" style={{ minWidth: '100%' }}>{children}</table>
        </div>
      )

    case 'tableBody':
      return <tbody key={keyPrefix}>{children}</tbody>

    case 'tableRow':
      return <tr key={keyPrefix}>{children}</tr>

    case 'tableCell':
      return (
        <td key={keyPrefix} className="px-4 py-2 text-sm" style={{ border: `1px solid ${SUBTLE_BORDER}` }}>
          {children}
        </td>
      )

    case 'tableHeader':
      return (
        <th key={keyPrefix} className="px-4 py-2 font-semibold text-sm" style={{ border: `1px solid ${SUBTLE_BORDER}`, backgroundColor: SUBTLE_FILL }}>
          {children}
        </th>
      )

    default:
      // Unknown node type — render children recursively so content is not lost
      if (children.length > 0) {
        return <React.Fragment key={keyPrefix}>{children}</React.Fragment>
      }
      return null
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function TipTapRenderer({ content, className }: TipTapRendererProps) {
  if (content === null || content === undefined) return null

  // Legacy HTML string path
  if (typeof content === 'string') {
    return (
      <div
        dir="rtl"
        className={[
          'prose prose-invert max-w-none text-zinc-200 leading-relaxed',
          className ?? '',
        ].join(' ')}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    )
  }

  // TipTap JSONContent path
  const rendered = renderNode(content, 'root')

  return (
    <div
      dir="rtl"
      className={['text-zinc-200', className ?? ''].join(' ')}
    >
      {rendered}
    </div>
  )
}
