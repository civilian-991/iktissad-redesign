'use client';

/**
 * IndexCard — one GCC exchange index (value + change). RTL, Western numerals.
 */

import { formatNumber } from '@/lib/i18n/format';
import { changeDirection, type MarketSummary } from '@/lib/gcc/markets';

const COLORS = {
  up: 'text-emerald-600',
  down: 'text-red-600',
  flat: 'text-muted-foreground',
} as const;

const ARROW = { up: '▲', down: '▼', flat: '—' } as const;

export default function IndexCard({ summary }: { summary: MarketSummary }) {
  const dir = changeDirection(summary.changePercent);
  const pct = summary.changePercent;

  return (
    <div className="rounded-xl border border-border bg-card p-4 text-start">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">{summary.exchangeName || summary.indexName}</h3>
        <span className="text-xs text-muted-foreground">{summary.indexName}</span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-2xl font-semibold tabular-nums">
          {summary.close != null ? formatNumber(summary.close, 'ar', { maximumFractionDigits: 2 }) : '—'}
        </p>
        <p className={`text-sm font-medium tabular-nums ${COLORS[dir]}`}>
          <span aria-hidden>{ARROW[dir]}</span>{' '}
          {pct != null ? `${formatNumber(Math.abs(pct), 'ar', { maximumFractionDigits: 2 })}%` : '—'}
        </p>
      </div>
      {summary.changePoints != null && (
        <p className={`mt-1 text-xs tabular-nums ${COLORS[dir]}`}>
          {formatNumber(summary.changePoints, 'ar', { maximumFractionDigits: 2, signDisplay: 'always' })}
        </p>
      )}
    </div>
  );
}
