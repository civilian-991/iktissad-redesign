/**
 * MarketDataExtension — TipTap custom node for inline stock/market data embeds.
 * Attrs: symbol, market, type ('chart'|'price'|'widget'), height (number)
 * Atom node (no editable content inside) — rendered via MarketDataNodeView.
 * On the public page, TipTapRenderer replaces this with <MarketWidget />.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { MarketDataNodeView } from './views/MarketDataNodeView'

export type MarketType = 'chart' | 'price' | 'widget'
export type MarketExchange = 'TADAWUL' | 'DFM' | 'ADX' | 'KSE' | 'MSM'

export const MarketDataExtension = Node.create({
  name: 'marketData',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      symbol: { default: 'ARAMCO.SR' },
      market: { default: 'TADAWUL' },
      type: { default: 'chart' },
      height: { default: 300 },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="market-data"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        {
          'data-type': 'market-data',
          'data-symbol': HTMLAttributes.symbol,
          'data-market': HTMLAttributes.market,
          'data-display-type': HTMLAttributes.type,
          'data-height': HTMLAttributes.height,
          class: 'market-data-block',
        },
        HTMLAttributes
      ),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MarketDataNodeView)
  },

  addCommands() {
    return {
      insertMarketData:
        (attrs?: { symbol?: string; market?: MarketExchange; type?: MarketType; height?: number }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              symbol: attrs?.symbol ?? 'ARAMCO.SR',
              market: attrs?.market ?? 'TADAWUL',
              type: attrs?.type ?? 'chart',
              height: attrs?.height ?? 300,
            },
          })
        },
    }
  },
})

// Extend TipTap Commands type
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    marketData: {
      insertMarketData: (attrs?: {
        symbol?: string
        market?: MarketExchange
        type?: MarketType
        height?: number
      }) => ReturnType
    }
  }
}
