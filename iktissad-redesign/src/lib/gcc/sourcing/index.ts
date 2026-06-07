/**
 * GCC sourcing — public entrypoint. Origin-first, Mubasher fallback (plan v4 §2).
 *
 * getFetcher() picks the authoritative origin fetcher when its egress is
 * configured (Browserbase key present), else the always-on Mubasher mirror.
 * ingestExchange() runs the keystone loop: list → dedup → fetch detail →
 * extract facts → persist. New disclosures come back as token-cheap handles.
 */

import { ruleFactExtractor } from './fact-extractor';
import { MubasherFetcher } from './mubasher-fetcher';
import { SupabaseDisclosureRepository } from './repository';
import { TadawulOriginFetcher } from './browserbase-fetcher';
import type {
  CachedDisclosure, DisclosureFetcher, DisclosureRepository, DisclosureType,
  ExchangeCode, FactExtractor,
} from './types';

export * from './types';
export { classifyDisclosure } from './classify';
export { ruleFactExtractor } from './fact-extractor';

/**
 * Resolve the best available fetcher for an exchange. Tadawul prefers the origin
 * (Browserbase) when configured; all exchanges fall back to Mubasher.
 */
export function getFetcher(exchange: ExchangeCode): DisclosureFetcher {
  if (exchange === 'TADAWUL') {
    const origin = new TadawulOriginFetcher();
    if (origin.isAvailable()) return origin;
  }
  // (ADX/DFM/QSE/BK/BHB/MSX origin adapters will slot in here behind the same port.)
  return new MubasherFetcher(exchange);
}

export interface IngestOptions {
  category?: DisclosureType;
  sinceISO?: string;
  limit?: number;
  /** Override for tests/DI. */
  repository?: DisclosureRepository;
  extractor?: FactExtractor;
  fetcher?: DisclosureFetcher;
}

export interface IngestResult {
  exchange: ExchangeCode;
  source: 'origin' | 'mirror';
  listed: number;
  newlyIngested: CachedDisclosure[];
  skippedDuplicates: number;
  errors: { nativeId: string; error: string }[];
}

/**
 * The keystone ingest loop for one exchange. Idempotent: already-seen
 * disclosures (by dedup_key) are skipped without re-fetching.
 */
export async function ingestExchange(exchange: ExchangeCode, opts: IngestOptions = {}): Promise<IngestResult> {
  const fetcher = opts.fetcher ?? getFetcher(exchange);
  const repo = opts.repository ?? new SupabaseDisclosureRepository();
  const extractor = opts.extractor ?? ruleFactExtractor;

  const result: IngestResult = {
    exchange,
    source: fetcher.tier === 'origin' ? 'origin' : 'mirror',
    listed: 0,
    newlyIngested: [],
    skippedDuplicates: 0,
    errors: [],
  };

  const refs = await fetcher.list({ category: opts.category, sinceISO: opts.sinceISO, limit: opts.limit });
  result.listed = refs.length;

  for (const ref of refs) {
    try {
      if (await repo.exists(exchange, ref.dedupKey)) {
        result.skippedDuplicates++;
        continue;
      }
      const detail = await fetcher.fetchDetail(ref.nativeId);
      const figures = extractor.extract(detail);
      const cached = await repo.save(detail, figures);
      result.newlyIngested.push(cached);
    } catch (e) {
      result.errors.push({ nativeId: ref.nativeId, error: e instanceof Error ? e.message : String(e) });
      // best-effort: one bad item never stops the run (research appendix §5)
    }
  }

  return result;
}
