/**
 * MarketDataNodeView — React NodeView for MarketDataExtension.
 * Renders an editor-side placeholder showing symbol, market, and display type.
 * Editors can change symbol, market, type, and height inline.
 * Design tokens: #183B4E obsidian, #DDA853 gold, #F5EEDC cream.
 */

import { useState } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import type { MarketType, MarketExchange } from '../MarketDataExtension'

// ─────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────

const TYPE_OPTIONS: { value: MarketType; labelAr: string; icon: string }[] = [
  { value: 'chart',  labelAr: 'مؤشر السهم',  icon: '📈' },
  { value: 'price',  labelAr: 'سعر السهم',   icon: '💰' },
  { value: 'widget', labelAr: 'أداة السوق',  icon: '📊' },
]

const MARKET_OPTIONS: { value: MarketExchange; labelAr: string }[] = [
  { value: 'TADAWUL', labelAr: 'تداول (السعودية)' },
  { value: 'DFM',     labelAr: 'سوق دبي المالي' },
  { value: 'ADX',     labelAr: 'سوق أبوظبي' },
  { value: 'KSE',     labelAr: 'البورصة الكويتية' },
  { value: 'MSM',     labelAr: 'سوق مسقط' },
]

const HEIGHT_PRESETS = [200, 300, 400, 500] as const

// ─────────────────────────────────────────────────────────────────
// Shared input style (matches other NodeViews in this project)
// ─────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(221,168,83,0.15)',
  borderRadius: '0.5rem',
  padding: '0.375rem 0.625rem',
  color: 'rgba(245,238,220,0.9)',
  fontSize: '0.8125rem',
  outline: 'none',
  width: '100%',
  direction: 'ltr',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
}

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────

export function MarketDataNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const symbol    = node.attrs.symbol as string
  const market    = node.attrs.market as MarketExchange
  const type      = node.attrs.type as MarketType
  const height    = node.attrs.height as number

  const [localSymbol, setLocalSymbol] = useState(symbol)

  const currentType = TYPE_OPTIONS.find((t) => t.value === type) ?? TYPE_OPTIONS[0]

  return (
    <NodeViewWrapper
      as="div"
      data-type="market-data"
      dir="rtl"
      style={{
        display: 'block',
        border: `1px solid rgba(221,168,83,0.35)`,
        borderRadius: '0.75rem',
        marginBlock: '1.5rem',
        background: 'rgba(24,59,78,0.6)',
        outline: selected ? '2px solid #DDA853' : 'none',
        outlineOffset: '2px',
        overflow: 'hidden',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          padding: '0.625rem 1rem',
          background: 'rgba(221,168,83,0.08)',
          borderBottom: '1px solid rgba(221,168,83,0.15)',
        }}
      >
        <span style={{ fontSize: '1.1rem' }}>{currentType.icon}</span>
        <span
          style={{
            fontWeight: 700,
            fontSize: '0.875rem',
            color: '#DDA853',
            letterSpacing: '0.02em',
          }}
        >
          {symbol}
        </span>
        <span style={{ color: 'rgba(245,238,220,0.4)', fontSize: '0.75rem' }}>·</span>
        <span style={{ color: 'rgba(245,238,220,0.55)', fontSize: '0.75rem' }}>
          {MARKET_OPTIONS.find((m) => m.value === market)?.labelAr ?? market}
        </span>
        <span
          style={{
            marginInlineStart: 'auto',
            color: 'rgba(245,238,220,0.4)',
            fontSize: '0.7rem',
            padding: '0.15rem 0.5rem',
            border: '1px solid rgba(221,168,83,0.2)',
            borderRadius: '999px',
          }}
        >
          {currentType.labelAr}
        </span>
      </div>

      {/* Chart placeholder */}
      <div
        style={{
          height: `${height}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          background: 'rgba(255,255,255,0.02)',
          color: 'rgba(245,238,220,0.25)',
          fontSize: '0.875rem',
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: '2.5rem', opacity: 0.3 }}>{currentType.icon}</span>
        <span>سيُعرض {currentType.labelAr} هنا</span>
        <span style={{ fontSize: '0.75rem', direction: 'ltr' }}>{symbol} @ {market}</span>
      </div>

      {/* Controls panel */}
      <div
        style={{ padding: '0.75rem 1rem', background: 'rgba(24,59,78,0.9)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Row 1: Symbol + Market */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.625rem' }}>
          {/* Symbol input */}
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', color: 'rgba(245,238,220,0.45)', fontSize: '0.7rem', marginBottom: '0.25rem' }}>
              رمز السهم
            </label>
            <input
              type="text"
              value={localSymbol}
              onChange={(e) => setLocalSymbol(e.target.value.toUpperCase())}
              onBlur={() => updateAttributes({ symbol: localSymbol })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  updateAttributes({ symbol: localSymbol })
                  ;(e.target as HTMLInputElement).blur()
                }
              }}
              placeholder="ARAMCO.SR"
              style={inputStyle}
            />
          </div>

          {/* Market select */}
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', color: 'rgba(245,238,220,0.45)', fontSize: '0.7rem', marginBottom: '0.25rem' }}>
              السوق
            </label>
            <select
              value={market}
              onChange={(e) => updateAttributes({ market: e.target.value as MarketExchange })}
              style={selectStyle}
            >
              {MARKET_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.labelAr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Display type selector */}
        <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.625rem', alignItems: 'center' }}>
          <span style={{ color: 'rgba(245,238,220,0.45)', fontSize: '0.7rem', flexShrink: 0 }}>
            نوع العرض:
          </span>
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateAttributes({ type: opt.value })}
              style={{
                padding: '0.2rem 0.625rem',
                borderRadius: '0.375rem',
                fontSize: '0.7rem',
                border: '1px solid',
                cursor: 'pointer',
                background: type === opt.value ? '#DDA853' : 'transparent',
                borderColor: type === opt.value ? '#DDA853' : 'rgba(221,168,83,0.25)',
                color: type === opt.value ? '#183B4E' : 'rgba(245,238,220,0.65)',
                fontWeight: type === opt.value ? 700 : 400,
                transition: 'all 0.15s',
              }}
            >
              {opt.icon} {opt.labelAr}
            </button>
          ))}
        </div>

        {/* Row 3: Height selector */}
        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
          <span style={{ color: 'rgba(245,238,220,0.45)', fontSize: '0.7rem', flexShrink: 0 }}>
            الارتفاع:
          </span>
          {HEIGHT_PRESETS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => updateAttributes({ height: h })}
              style={{
                padding: '0.2rem 0.5rem',
                borderRadius: '0.375rem',
                fontSize: '0.7rem',
                border: '1px solid',
                cursor: 'pointer',
                background: height === h ? 'rgba(221,168,83,0.15)' : 'transparent',
                borderColor: height === h ? '#DDA853' : 'rgba(221,168,83,0.2)',
                color: height === h ? '#DDA853' : 'rgba(245,238,220,0.5)',
                transition: 'all 0.15s',
              }}
            >
              {h}px
            </button>
          ))}
        </div>
      </div>
    </NodeViewWrapper>
  )
}
