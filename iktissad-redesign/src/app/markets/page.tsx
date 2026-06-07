import type { Metadata } from 'next';
import MarketsPageClient from './MarketsPageClient';
import { createClient } from '@/lib/supabase/server';
import { mapMarketSummary, mapSectorIndex, type MarketSummary, type SectorIndex } from '@/lib/gcc/markets';

export const metadata: Metadata = {
  title: 'الأسواق الخليجية — مؤشرات البورصات الخليجية السبع',
  description:
    'مؤشرات البورصات الخليجية (تداول، أبوظبي، دبي، قطر، الكويت، البحرين، مسقط) وأداء القطاعات، محدّثة آنياً.',
};

// Public market-data tables carry public-read RLS (migration 044); the anon
// server client can read them. Empty until market-data ingestion (Phase 4) runs.
export default async function MarketsPage() {
  const supabase = await createClient();

  let initialSummaries: MarketSummary[] = [];
  let initialSectors: SectorIndex[] = [];

  try {
    const { data: sumRows } = await (supabase.from('gcc_market_summaries') as any)
      .select('*, gcc_exchanges:exchange_id ( code, name )')
      .order('trading_date', { ascending: false })
      .limit(50);

    // Keep only the latest row per exchange (most recent trading_date wins).
    const byExchange = new Map<string, MarketSummary>();
    for (const row of (sumRows ?? []) as any[]) {
      const m = mapMarketSummary(row);
      if (!byExchange.has(m.exchangeCode)) byExchange.set(m.exchangeCode, m);
    }
    initialSummaries = [...byExchange.values()];

    if (initialSummaries.length) {
      const { data: secRows } = await (supabase.from('gcc_sector_indices') as any)
        .select('*, gcc_sectors:sector_id ( name )')
        .eq('market_summary_id', initialSummaries[0].id)
        .limit(30);
      initialSectors = ((secRows ?? []) as any[]).map(mapSectorIndex);
    }
  } catch {
    // graceful: render the empty state if the tables aren't applied yet
  }

  return <MarketsPageClient initialSummaries={initialSummaries} initialSectors={initialSectors} />;
}
