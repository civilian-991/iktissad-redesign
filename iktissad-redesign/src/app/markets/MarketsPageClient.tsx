'use client';

/**
 * /markets — live GCC markets widget (plan v4 Phase 4 / research appendix §14).
 *
 * SSR-seeded for SEO + first paint; subscribes to Supabase Realtime so index
 * values update live (UPSERT → postgres_changes → state). RTL, Western numerals.
 * Renders gracefully when no market data has been ingested yet.
 */

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import IndexCard from '@/components/markets/IndexCard';
import { createClient } from '@/lib/supabase/client';
import { changeDirection, mapMarketSummary, type MarketSummary, type SectorIndex } from '@/lib/gcc/markets';
import { formatNumber } from '@/lib/i18n/format';

interface Props {
  initialSummaries: MarketSummary[];
  initialSectors: SectorIndex[];
}

export default function MarketsPageClient({ initialSummaries, initialSectors }: Props) {
  const [summaries, setSummaries] = useState<MarketSummary[]>(initialSummaries);
  const [sectors] = useState<SectorIndex[]>(initialSectors);

  // Live updates: replace a summary row in place when it UPSERTs.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('gcc-markets')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gcc_market_summaries' },
        (payload) => {
          const row = mapMarketSummary(payload.new as any);
          setSummaries((prev) => {
            const idx = prev.findIndex((s) => s.id === row.id);
            if (idx === -1) return [...prev, row];
            const next = [...prev];
            next[idx] = row;
            return next;
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const hasData = summaries.length > 0;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8 text-start">
          <h1 className="text-3xl font-bold">الأسواق الخليجية</h1>
          <p className="mt-2 text-muted-foreground">
            مؤشرات البورصات الخليجية السبع وأداء القطاعات — تُحدّث آنياً.
          </p>
        </header>

        {!hasData ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
            لا تتوفر بيانات سوقية بعد. سيظهر هذا القسم فور بدء تغذية بيانات السوق.
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {summaries.map((s) => (
              <IndexCard key={s.id} summary={s} />
            ))}
          </section>
        )}

        {sectors.length > 0 && (
          <section className="mt-10 text-start">
            <h2 className="mb-4 text-xl font-semibold">أداء القطاعات</h2>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-start text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-start font-medium">القطاع</th>
                    <th className="px-4 py-2 text-end font-medium">القيمة</th>
                    <th className="px-4 py-2 text-end font-medium">التغير %</th>
                  </tr>
                </thead>
                <tbody>
                  {sectors.map((sec) => {
                    const dir = changeDirection(sec.changePercent);
                    const cls = dir === 'up' ? 'text-emerald-600' : dir === 'down' ? 'text-red-600' : 'text-muted-foreground';
                    return (
                      <tr key={sec.id} className="border-t border-border">
                        <td className="px-4 py-2">{sec.sectorName}</td>
                        <td className="px-4 py-2 text-end tabular-nums">
                          {sec.close != null ? formatNumber(sec.close, 'ar', { maximumFractionDigits: 2 }) : '—'}
                        </td>
                        <td className={`px-4 py-2 text-end tabular-nums ${cls}`}>
                          {sec.changePercent != null
                            ? `${formatNumber(sec.changePercent, 'ar', { maximumFractionDigits: 2, signDisplay: 'always' })}%`
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
