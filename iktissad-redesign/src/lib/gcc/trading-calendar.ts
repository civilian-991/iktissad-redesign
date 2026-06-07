/**
 * Trading-calendar awareness (plan v4 Phase 3.3).
 *
 * The Selector schedule should only screen on trading days. Uses
 * gcc_trading_calendars when populated; otherwise falls back to the GCC weekend
 * heuristic (Friday + Saturday are non-trading across all 7 exchanges).
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type { ExchangeCode } from './sourcing/types';

/** JS getUTCDay(): 0=Sun … 5=Fri, 6=Sat. GCC weekend = Fri + Sat. */
function isWeekendGcc(dateISO: string): boolean {
  const day = new Date(dateISO).getUTCDay();
  return day === 5 || day === 6;
}

/**
 * Is `dateISO` (YYYY-MM-DD) a trading day for `exchange`?
 * Calendar row wins; absent a row, weekday heuristic applies.
 */
export async function isTradingDay(exchange: ExchangeCode, dateISO: string): Promise<boolean> {
  const date = dateISO.slice(0, 10);
  const admin = createAdminClient();

  const { data: ex } = await (admin.from('gcc_exchanges') as any)
    .select('id')
    .eq('code', exchange)
    .maybeSingle();
  if (!ex?.id) return !isWeekendGcc(date); // unknown exchange → heuristic

  const { data: cal } = await (admin.from('gcc_trading_calendars') as any)
    .select('is_trading_day')
    .eq('exchange_id', ex.id)
    .eq('date', date)
    .maybeSingle();

  if (cal && typeof cal.is_trading_day === 'boolean') return cal.is_trading_day;
  return !isWeekendGcc(date); // no calendar row → heuristic
}

/** Synchronous heuristic for callers that don't want a DB round-trip. */
export function isLikelyTradingDay(dateISO: string): boolean {
  return !isWeekendGcc(dateISO);
}
