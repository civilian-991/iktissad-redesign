'use client';

/**
 * Sparkline — TradingView lightweight-charts v5 (plan v4 §2 / research appendix
 * §14). Canvas is client-only; use real-time `.update()` not `setData()`.
 * Western numerals via locale `ar-SA-u-nu-latn` (the site forces 0-9). RTL is
 * handled by the surrounding DOM; the price axis is hidden for a clean sparkline.
 */

import { useEffect, useRef } from 'react';
import { createChart, AreaSeries, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts';

const AR_WESTERN = 'ar-SA-u-nu-latn';

export interface SparkPoint {
  time: number; // unix seconds
  value: number;
}

interface SparklineProps {
  data: SparkPoint[];
  /** push a single live point (callers can ref this via key remount instead). */
  color?: string;
  height?: number;
}

export default function Sparkline({ data, color = '#16a34a', height = 48 }: SparklineProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);

  // create once
  useEffect(() => {
    if (!elRef.current) return;
    const chart = createChart(elRef.current, {
      autoSize: true,
      height,
      layout: { background: { color: 'transparent' }, textColor: 'transparent', attributionLogo: false },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { visible: false },
      leftPriceScale: { visible: false },
      timeScale: { visible: false, borderVisible: false },
      crosshair: { horzLine: { visible: false }, vertLine: { visible: false } },
      handleScroll: false,
      handleScale: false,
      localization: {
        locale: AR_WESTERN,
        priceFormatter: (p: number) =>
          new Intl.NumberFormat(AR_WESTERN, { maximumFractionDigits: 2 }).format(p),
      },
    });
    const series = chart.addSeries(AreaSeries, {
      lineColor: color,
      topColor: `${color}33`,
      bottomColor: `${color}00`,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    chartRef.current = chart;
    seriesRef.current = series;
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // height/color are stable per mount; data handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // set/replace data (full series). For live ticks, callers update `data`.
  useEffect(() => {
    if (!seriesRef.current || !data.length) return;
    seriesRef.current.setData(
      data.map((d) => ({ time: d.time as UTCTimestamp, value: d.value }))
    );
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return <div ref={elRef} style={{ width: '100%', height }} aria-hidden />;
}
