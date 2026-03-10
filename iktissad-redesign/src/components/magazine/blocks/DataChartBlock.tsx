'use client'

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { DataChartBlock } from '@/types'

interface Props {
  block: DataChartBlock
}

// Magazine palette: gold primary, navy secondary, blue tertiary
const CHART_COLORS = ['#DDA853', '#183B4E', '#27548A', '#C49240', '#F5EEDC']

/**
 * DataChartBlock — Recharts wrapper with magazine styling.
 *
 * Supports: bar, line, area, pie, donut
 * Colors: gold (#DDA853) primary, navy (#183B4E) secondary
 * Tooltip values formatted as Arabic locale numbers
 *
 * Data format: block.data = [{ label, value, color? }]
 * Internally mapped to recharts { name, value } format.
 */
export function DataChartBlock({ block }: Props) {
  const chartData = block.data.map(d => ({ name: d.label, value: d.value }))

  const arabicFormatter = (value: number) => value.toLocaleString('ar-SA')

  const tooltipStyle = {
    fontFamily: 'Tajawal, sans-serif',
    fontSize: '0.85rem',
    direction: 'rtl' as const,
    borderColor: '#DDA853',
  }

  /** Recharts v3 custom tooltip content component — typed loosely to stay compatible across versions */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div
        style={{
          ...tooltipStyle,
          background: 'white',
          border: `1px solid ${tooltipStyle.borderColor}`,
          padding: '0.5rem 0.75rem',
          borderRadius: '0.25rem',
        }}
      >
        {label && (
          <p style={{ margin: '0 0 0.25rem', fontWeight: 600, color: '#183B4E' }}>{label as string}</p>
        )}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {(payload as any[]).map((entry: any, i: number) => (
          <p key={i} style={{ margin: 0, color: (entry.color as string | undefined) ?? '#DDA853' }}>
            {arabicFormatter((entry.value as number | undefined) ?? 0)}
          </p>
        ))}
      </div>
    )
  }

  const axisTickStyle = {
    fontFamily: 'Tajawal, sans-serif' as const,
    fontSize: 12,
    fill: '#183B4E',
  }

  const renderChart = () => {
    switch (block.chartType) {
      case 'bar':
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(24,59,78,0.08)" />
            <XAxis dataKey="name" tick={axisTickStyle} />
            <YAxis tickFormatter={arabicFormatter} tick={axisTickStyle} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" fill="#DDA853" radius={[2, 2, 0, 0]} />
          </BarChart>
        )

      case 'line':
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(24,59,78,0.08)" />
            <XAxis dataKey="name" tick={axisTickStyle} />
            <YAxis tickFormatter={arabicFormatter} tick={axisTickStyle} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#DDA853"
              strokeWidth={2}
              dot={{ fill: '#DDA853', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#183B4E' }}
            />
          </LineChart>
        )

      case 'area':
        return (
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="areaGold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#DDA853" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#DDA853" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(24,59,78,0.08)" />
            <XAxis dataKey="name" tick={axisTickStyle} />
            <YAxis tickFormatter={arabicFormatter} tick={axisTickStyle} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#DDA853"
              strokeWidth={2}
              fill="url(#areaGold)"
            />
          </AreaChart>
        )

      case 'pie':
      case 'donut':
        return (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={block.chartType === 'donut' ? 60 : 0}
              outerRadius={100}
              dataKey="value"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              label={({ name, percent }: any) =>
                `${name as string} ${(((percent as number | undefined) ?? 0) * 100).toFixed(0)}%`
              }
              labelLine={{ stroke: '#183B4E' }}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    block.data[index]?.color ??
                    CHART_COLORS[index % CHART_COLORS.length]
                  }
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        )

      default:
        return null
    }
  }

  const chart = renderChart()

  return (
    <div
      dir="rtl"
      style={{ marginBlockStart: '2em', marginBlockEnd: '2em' }}
      className="magazine-data-chart"
    >
      {block.title && (
        <p
          style={{
            fontFamily: "var(--font-body, 'Tajawal', sans-serif)",
            fontWeight: 700,
            fontSize: '1rem',
            color: '#183B4E',
            marginBlockEnd: '1rem',
            marginBlockStart: 0,
          }}
        >
          {block.title}
        </p>
      )}

      {chart ? (
        <ResponsiveContainer width="100%" height={300}>
          {chart}
        </ResponsiveContainer>
      ) : (
        /* Fallback: simple data display if chartType is unknown */
        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '0.5rem 1rem',
            fontFamily: "var(--font-body, 'Tajawal', sans-serif)",
            fontSize: '0.9rem',
          }}
        >
          {chartData.map((d, i) => (
            <div key={i} style={{ display: 'contents' }}>
              <dt style={{ color: '#27548A', fontWeight: 600 }}>{d.name}</dt>
              <dd style={{ color: '#183B4E', margin: 0 }}>{arabicFormatter(d.value)}</dd>
            </div>
          ))}
        </dl>
      )}

      {block.source && (
        <p
          style={{
            fontFamily: "var(--font-body, 'Tajawal', sans-serif)",
            fontSize: '0.75rem',
            color: '#999',
            marginBlockStart: '0.5rem',
            marginBlockEnd: 0,
            textAlign: 'start',
          }}
        >
          المصدر: {block.source}
        </p>
      )}
    </div>
  )
}
