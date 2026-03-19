/**
 * MarketWidget — Public-facing market data embed component.
 * Used by TipTapRenderer to render 'marketData' TipTap nodes on article pages.
 *
 * Supports three display modes:
 *   "price"  — compact inline price badge
 *   "chart"  — LineChart (recharts) with 30-day price history
 *   "widget" — full card with volume, high, low, market cap
 *
 * RTL-aware, dark-mode compatible, Arabic numerals optional.
 * Fetches from /api/market-data?symbol=X&market=Y
 */

'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, BarChart3, RefreshCw, AlertCircle } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { MarketDataResponse } from '@/app/api/market-data/route'

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type MarketWidgetType = 'chart' | 'price' | 'widget'

export interface MarketWidgetProps {
  symbol: string
  market: string
  type?: MarketWidgetType
  height?: number
  /** If true, render numbers in Eastern Arabic numerals */
  arabicNumerals?: boolean
  className?: string
}

// ─────────────────────────────────────────────────────────────────
// Number formatting helpers
// ─────────────────────────────────────────────────────────────────

function formatPrice(value: number, currency: string, arabic = false): string {
  const locale = arabic ? 'ar-SA' : 'en-US'
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  }).format(value) + ' ' + currency
}

function formatVolume(value: number, arabic = false): string {
  const locale = arabic ? 'ar-SA' : 'en-US'
  if (value >= 1_000_000_000) {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value / 1_000_000_000) + (arabic ? ' م' : 'B')
  }
  if (value >= 1_000_000) {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value / 1_000_000) + (arabic ? ' م' : 'M')
  }
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value)
}

function formatMarketCap(value: number, currency: string, arabic = false): string {
  const locale = arabic ? 'ar-SA' : 'en-US'
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value) + ' ' + (arabic ? 'مليار ' : 'B ') + currency
}

function formatDate(dateStr: string, arabic = false): string {
  return new Date(dateStr).toLocaleDateString(arabic ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })
}

// ─────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────

interface ChangeIndicatorProps {
  change: number
  changePercent: number
  arabic?: boolean
}

function ChangeIndicator({ change, changePercent, arabic = false }: ChangeIndicatorProps) {
  const isPositive = change >= 0
  const locale = arabic ? 'ar-SA' : 'en-US'
  const sign = isPositive ? '+' : ''
  const pct = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(changePercent))
  const abs = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(Math.abs(change))

  return (
    <span
      className="inline-flex items-center gap-1 text-sm font-semibold"
      style={{ color: isPositive ? '#22c55e' : '#ef4444' }}
    >
      {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      {sign}{abs} ({sign}{pct}%)
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────
// Price mode — compact badge
// ─────────────────────────────────────────────────────────────────

interface PriceWidgetProps {
  data: MarketDataResponse
  arabic?: boolean
}

function PriceWidget({ data, arabic = false }: PriceWidgetProps) {
  const isPositive = data.change >= 0

  return (
    <div
      dir="rtl"
      className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl border"
      style={{
        background: 'rgba(24,59,78,0.7)',
        borderColor: isPositive ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <BarChart3 size={16} style={{ color: '#DDA853', flexShrink: 0 }} />
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-white/50 leading-none">{data.nameAr}</span>
        <span className="text-base font-bold text-white leading-none tabular-nums">
          {formatPrice(data.price, data.currency, arabic)}
        </span>
      </div>
      <ChangeIndicator change={data.change} changePercent={data.changePercent} arabic={arabic} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Chart mode — LineChart with history
// ─────────────────────────────────────────────────────────────────

interface ChartWidgetProps {
  data: MarketDataResponse
  height: number
  arabic?: boolean
}

interface TooltipPayloadItem {
  value: number
}

function ChartWidget({ data, height, arabic = false }: ChartWidgetProps) {
  const isPositive = data.change >= 0
  const lineColor = isPositive ? '#22c55e' : '#ef4444'

  const chartData = data.history.map((point) => ({
    date: formatDate(point.date, arabic),
    price: point.price,
  }))

  return (
    <div
      dir="rtl"
      className="rounded-xl border overflow-hidden"
      style={{
        background: 'rgba(24,59,78,0.7)',
        borderColor: 'rgba(221,168,83,0.2)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white/90">{data.nameAr}</span>
            <span className="text-xs text-white/35 font-mono">{data.symbol}</span>
          </div>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-2xl font-bold text-white tabular-nums">
              {formatPrice(data.price, data.currency, arabic)}
            </span>
            <ChangeIndicator change={data.change} changePercent={data.changePercent} arabic={arabic} />
          </div>
        </div>
        <div className="text-xs text-white/30 flex items-center gap-1 mt-1 flex-shrink-0">
          <RefreshCw size={10} />
          <span>{arabic ? 'مباشر' : 'Live'}</span>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: Math.max(height - 100, 120) }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }}
              axisLine={false}
              tickLine={false}
              width={55}
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => v.toFixed(2)}
              orientation="left"
            />
            <Tooltip
              contentStyle={{
                background: '#183B4E',
                border: '1px solid rgba(221,168,83,0.2)',
                borderRadius: '0.5rem',
                fontSize: '0.8125rem',
                color: '#F5EEDC',
              }}
              formatter={(value) => [
                formatPrice((value as number) ?? 0, data.currency, arabic),
                arabic ? 'السعر' : 'Price',
              ]}
              labelStyle={{ color: 'rgba(245,238,220,0.5)', marginBottom: '0.25rem' }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: lineColor, stroke: '#183B4E', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <div className="px-5 py-2 border-t flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <span className="text-xs text-white/30">{data.market}</span>
        <span className="text-xs text-white/25">
          {arabic ? 'بيانات توضيحية' : 'Demo data'}
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Widget mode — full card with OHLC + volume + market cap
// ─────────────────────────────────────────────────────────────────

interface FullWidgetProps {
  data: MarketDataResponse
  height: number
  arabic?: boolean
}

function FullWidget({ data, arabic = false }: FullWidgetProps) {
  const isPositive = data.change >= 0

  const stats: { label: string; value: string }[] = [
    { label: arabic ? 'أعلى سعر' : 'High', value: formatPrice(data.high, data.currency, arabic) },
    { label: arabic ? 'أدنى سعر' : 'Low', value: formatPrice(data.low, data.currency, arabic) },
    { label: arabic ? 'حجم التداول' : 'Volume', value: formatVolume(data.volume, arabic) },
    { label: arabic ? 'القيمة السوقية' : 'Market Cap', value: formatMarketCap(data.marketCap, data.currency, arabic) },
  ]

  return (
    <div
      dir="rtl"
      className="rounded-xl border overflow-hidden"
      style={{
        background: 'rgba(24,59,78,0.7)',
        borderColor: isPositive ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4"
        style={{
          background: isPositive ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 size={16} style={{ color: '#DDA853' }} />
              <span className="text-base font-bold text-white">{data.nameAr}</span>
              <span className="text-xs text-white/35 font-mono">{data.symbol}</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-white tabular-nums">
                {formatPrice(data.price, data.currency, arabic)}
              </span>
            </div>
          </div>
          <div className="text-left flex flex-col items-end gap-1">
            <ChangeIndicator change={data.change} changePercent={data.changePercent} arabic={arabic} />
            <span className="text-xs text-white/30">{data.market}</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 divide-x divide-y divide-white/5">
        {stats.map((stat) => (
          <div key={stat.label} className="px-4 py-3">
            <div className="text-xs text-white/40 mb-1">{stat.label}</div>
            <div className="text-sm font-semibold text-white/85 tabular-nums">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        className="px-5 py-2 flex items-center justify-between"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <span className="text-xs text-white/25">
          {arabic ? 'آخر تحديث: ' : 'Updated: '}
          {new Date(data.lastUpdated).toLocaleTimeString(arabic ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="text-xs text-white/20">{arabic ? 'بيانات توضيحية' : 'Demo data'}</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Loading skeleton
// ─────────────────────────────────────────────────────────────────

function WidgetSkeleton({ height }: { height: number }) {
  return (
    <div
      className="rounded-xl border animate-pulse"
      style={{
        height,
        background: 'rgba(24,59,78,0.4)',
        borderColor: 'rgba(221,168,83,0.1)',
      }}
    >
      <div className="p-5 space-y-3">
        <div className="h-4 w-32 rounded-md bg-white/10" />
        <div className="h-8 w-48 rounded-md bg-white/10" />
        <div className="h-3 w-24 rounded-md bg-white/10" />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Error state
// ─────────────────────────────────────────────────────────────────

function WidgetError({ symbol, onRetry }: { symbol: string; onRetry: () => void }) {
  return (
    <div
      dir="rtl"
      className="rounded-xl border px-5 py-4 flex items-center gap-3"
      style={{
        background: 'rgba(239,68,68,0.06)',
        borderColor: 'rgba(239,68,68,0.2)',
      }}
    >
      <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
      <div className="flex-1">
        <p className="text-sm text-white/70">تعذّر تحميل بيانات {symbol}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="text-xs text-white/50 hover:text-white/80 transition-colors flex items-center gap-1"
      >
        <RefreshCw size={12} />
        إعادة المحاولة
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────

export default function MarketWidget({
  symbol,
  market,
  type = 'chart',
  height = 300,
  arabicNumerals = true,
  className = '',
}: MarketWidgetProps) {
  const [data, setData] = useState<MarketDataResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [fetchKey, setFetchKey] = useState(0)

  useEffect(() => {
    if (!symbol) return

    let cancelled = false
    setLoading(true)
    setError(false)

    const params = new URLSearchParams({ symbol, market })

    fetch(`/api/market-data?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<MarketDataResponse>
      })
      .then((json) => {
        if (!cancelled) {
          setData(json)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [symbol, market, fetchKey])

  const retry = () => setFetchKey((k) => k + 1)

  if (loading) {
    return (
      <div className={className}>
        <WidgetSkeleton height={type === 'price' ? 56 : height} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={className}>
        <WidgetError symbol={symbol} onRetry={retry} />
      </div>
    )
  }

  return (
    <div className={className}>
      {type === 'price' && (
        <PriceWidget data={data} arabic={arabicNumerals} />
      )}
      {type === 'chart' && (
        <ChartWidget data={data} height={height} arabic={arabicNumerals} />
      )}
      {type === 'widget' && (
        <FullWidget data={data} height={height} arabic={arabicNumerals} />
      )}
    </div>
  )
}

export { MarketWidget }
