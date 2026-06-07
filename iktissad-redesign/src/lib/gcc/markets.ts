/**
 * Live markets widget — shared types + row mappers (plan v4 §2 / Phase 4).
 *
 * Reads the public market-data tables seeded by migration 044
 * (gcc_market_summaries, gcc_sector_indices) which already carry public-read RLS
 * policies. No server imports here so the file is safe to import from client
 * components; the actual query lives in the server page component.
 */

export interface MarketSummary {
  id: string;
  exchangeCode: string;
  exchangeName: string; // Arabic
  tradingDate: string;
  indexName: string;
  close: number | null;
  changePoints: number | null;
  changePercent: number | null;
  volume: number | null;
  value: number | null;
  currency: string | null;
  updatedAt: string;
}

export interface SectorIndex {
  id: string;
  sectorName: string;
  close: number | null;
  changePercent: number | null;
}

/** Map a gcc_market_summaries row (+ joined gcc_exchanges) to camelCase. */
export function mapMarketSummary(row: any): MarketSummary {
  return {
    id: row.id,
    exchangeCode: row.gcc_exchanges?.code ?? row.exchange_code ?? '',
    exchangeName: row.gcc_exchanges?.name ?? row.exchange_name ?? '',
    tradingDate: row.trading_date,
    indexName: row.index_name,
    close: row.index_close,
    changePoints: row.change_points,
    changePercent: row.change_percent,
    volume: row.volume,
    value: row.value,
    currency: row.currency,
    updatedAt: row.updated_at ?? row.extraction_ts ?? row.created_at,
  };
}

export function mapSectorIndex(row: any): SectorIndex {
  return {
    id: row.id,
    sectorName: row.sector_name ?? row.gcc_sectors?.name ?? '',
    close: row.close,
    changePercent: row.change_percent,
  };
}

/** Direction helper for RTL-safe colouring. */
export function changeDirection(pct: number | null | undefined): 'up' | 'down' | 'flat' {
  if (pct == null || pct === 0) return 'flat';
  return pct > 0 ? 'up' : 'down';
}
