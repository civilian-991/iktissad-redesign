'use client'

import dynamic from 'next/dynamic'
import type { ArticleBlock } from '@/types'

import { ParagraphBlock } from './blocks/ParagraphBlock'
import { HeadingBlock } from './blocks/HeadingBlock'
import { PullQuoteBlock } from './blocks/PullQuoteBlock'
import { FigureBlock } from './blocks/FigureBlock'
import { SidebarBlock } from './blocks/SidebarBlock'
import { DataTableBlock } from './blocks/DataTableBlock'
import { PhotoEssayBlock } from './blocks/PhotoEssayBlock'
import { CalloutBlock } from './blocks/CalloutBlock'
import { DividerBlock } from './blocks/DividerBlock'
import { EmbedBlock } from './blocks/EmbedBlock'
import { BeforeAfterBlock } from './blocks/BeforeAfterBlock'

// ── Lazy-load Recharts (large bundle) ────────────────────────────────────────
// DataChartBlock imports recharts which is ~250KB. Defer it so article pages
// load fast even when they contain charts.
const DataChartBlock = dynamic(
  () => import('./blocks/DataChartBlock').then(m => ({ default: m.DataChartBlock })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: 300,
          background: 'rgba(24,59,78,0.04)',
          borderRadius: 4,
          marginBlock: '2em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(24,59,78,0.3)',
          fontFamily: 'var(--font-body)',
          fontSize: '0.875rem',
        }}
        aria-label="جاري تحميل الرسم البياني"
      >
        ⟳
      </div>
    ),
  },
)

interface BlockRendererProps {
  blocks: ArticleBlock[]
  className?: string
}

/**
 * BlockRenderer — Renders an array of ArticleBlock items to styled React elements.
 *
 * Wrapped in .magazine-article-body for magazine typography CSS context.
 * Handles first/subsequent paragraph detection for indent logic.
 */
export function BlockRenderer({ blocks, className }: BlockRendererProps) {
  if (!blocks?.length) return null

  return (
    <div
      className={['magazine-article-body', className].filter(Boolean).join(' ')}
      dir="rtl"
    >
      {blocks.map((block, i) => (
        <BlockItem key={i} block={block} index={i} blocks={blocks} />
      ))}
    </div>
  )
}

interface BlockItemProps {
  block: ArticleBlock
  index: number
  blocks: ArticleBlock[]
}

/**
 * BlockItem — Dispatches to the correct block component based on _type.
 *
 * Tracks whether a paragraph is "first" (immediately follows a heading or is the first block)
 * to control text-indent behavior.
 */
function BlockItem({ block, index, blocks }: BlockItemProps) {
  switch (block._type) {
    case 'paragraph': {
      // A paragraph is "first" (no indent) if it's:
      // - The very first block in the array
      // - Immediately preceded by a heading block
      const prevBlock = index > 0 ? blocks[index - 1] : null
      const isFirst = index === 0 || prevBlock?._type === 'heading'
      return <ParagraphBlock block={block} isFirst={isFirst} />
    }

    case 'heading': {
      const isFirstOnPage = index === 0
      return <HeadingBlock block={block} isFirstOnPage={isFirstOnPage} />
    }

    case 'pullQuote':
      return <PullQuoteBlock block={block} />

    case 'figure':
      return <FigureBlock block={block} />

    case 'sidebar':
      return <SidebarBlock block={block} />

    case 'dataChart':
      return <DataChartBlock block={block} />

    case 'dataTable':
      return <DataTableBlock block={block} />

    case 'photoEssay':
      return <PhotoEssayBlock block={block} />

    case 'callout':
      return <CalloutBlock block={block} />

    case 'divider':
      return <DividerBlock block={block} />

    case 'embed':
      return <EmbedBlock block={block} />

    case 'beforeAfter':
      return <BeforeAfterBlock block={block} />

    default:
      // Exhaustive check — TypeScript will warn if a new block type is added to the union
      // without a case here, but we return null gracefully in production.
      return null
  }
}
