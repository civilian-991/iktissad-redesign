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
          <code key={key} className="bg-zinc-800 text-amber-400 px-1 rounded text-sm">
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
            className="text-amber-400 underline hover:text-amber-300 transition-colors"
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
        <p key={keyPrefix} dir="rtl" className="mb-4 text-zinc-200 leading-relaxed text-base">
          {children.length > 0 ? children : <br />}
        </p>
      )

    case 'heading': {
      const level = (node.attrs?.level as number) ?? 2
      if (level === 1) {
        return (
          <h1 key={keyPrefix} dir="rtl" className="text-3xl font-bold text-white mb-4 mt-8 font-serif">
            {children}
          </h1>
        )
      }
      if (level === 2) {
        return (
          <h2 key={keyPrefix} dir="rtl" className="text-2xl font-bold text-white mb-3 mt-6 border-b border-zinc-700 pb-2">
            {children}
          </h2>
        )
      }
      // level 3+
      return (
        <h3 key={keyPrefix} dir="rtl" className="text-xl font-semibold text-white mb-2 mt-4">
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
        <pre key={keyPrefix} className="bg-zinc-800 rounded-lg p-4 my-4 overflow-x-auto">
          <code className="text-sm text-green-400 font-mono">{children}</code>
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
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={keyPrefix}
          src={src}
          alt={alt}
          title={title}
          className="max-w-full rounded-lg my-4"
        />
      )
    }

    case 'table':
      return (
        <div key={keyPrefix} className="overflow-x-auto my-4">
          <table className="w-full border-collapse">{children}</table>
        </div>
      )

    case 'tableBody':
      return <tbody key={keyPrefix}>{children}</tbody>

    case 'tableRow':
      return <tr key={keyPrefix}>{children}</tr>

    case 'tableCell':
      return (
        <td key={keyPrefix} className="border border-zinc-700 px-4 py-2 text-zinc-200 text-sm">
          {children}
        </td>
      )

    case 'tableHeader':
      return (
        <th key={keyPrefix} className="border border-zinc-700 px-4 py-2 text-white font-semibold bg-zinc-800 text-sm">
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
