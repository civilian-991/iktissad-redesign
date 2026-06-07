/**
 * GCC disclosure sourcing — hexagonal ports & domain types (plan v4 §2, keystone).
 *
 * The design rule (EDGAR adapter pattern, research appendix §7): keep all the
 * exchange-specific and anti-bot (Akamai) quirks behind ONE fetcher adapter;
 * everything downstream is source-agnostic. Adding ADX/DFM/QSE/etc. = a new
 * DisclosureFetcher behind these same ports.
 *
 * "References, not payloads": fetchers return a CachedDisclosure that carries
 * Storage URLs + extracted facts, never a multi-MB PDF in memory.
 */

/** The 7 GCC exchanges (matches gcc_exchanges.code in migration 044). */
export type ExchangeCode = 'TADAWUL' | 'ADX' | 'DFM' | 'QSE' | 'BK' | 'BHB' | 'MSX';

/** Disclosure categories (matches gcc_disclosure_events.type CHECK in 044). */
export type DisclosureType =
  | 'market_summary' | 'earnings' | 'dividend' | 'agm_egm' | 'board' | 'halt'
  | 'ipo_listing' | 'ownership' | 'capital_change' | 'regulatory' | 'debt_fund' | 'other';

/** Where a disclosure came from — drives EEAT/confidence (origin > mirror). */
export type SourceTier = 'origin' | 'mirror';

/**
 * Lightweight listing entry (~30 tokens). What `list()` returns. Never carries
 * the body/PDF — only enough to dedup, classify, and decide whether to fetch.
 */
export interface DisclosureRef {
  exchange: ExchangeCode;
  /** Exchange-native id (Tadawul anId, QSE InfoID, …). Best dedup key. */
  nativeId: string;
  /** Stable dedup key: nativeId when present, else a normalized title hash. */
  dedupKey: string;
  title: string;
  url: string;
  filedAt?: string; // ISO
  category?: DisclosureType;
  sourceTier: SourceTier;
}

/** A single deterministically-extracted figure (ground truth for the Verifier). */
export interface VerifiedFigure {
  label: string;
  labelNormalized: string;
  value: number;
  unit?: string;
  scale?: 'absolute' | 'thousands' | 'millions' | 'billions';
  period?: string;
  sourceSpan: string;
  extractionMethod: 'rule' | 'xbrl' | 'table' | 'manual';
}

/** Raw fetch result, in memory only briefly before it's persisted + released. */
export interface FetchedDisclosure {
  ref: DisclosureRef;
  bodyText: string;
  /** Raw PDF bytes if the disclosure has an attachment (released after upload). */
  pdfBytes?: Uint8Array;
  pdfUrl?: string;
  structured?: Record<string, unknown>;
  raw?: Record<string, unknown>;
}

/**
 * The token-cheap handle the rest of the pipeline sees: references + extracted
 * facts, NO body/PDF held in memory. (EDGAR-ux "paths not 241K tokens".)
 */
export interface CachedDisclosure {
  exchange: ExchangeCode;
  nativeId: string;
  disclosureEventId: string; // gcc_disclosure_events.id (DB row)
  title: string;
  url: string;
  pdfStorageUrl?: string;
  sourceTier: SourceTier;
  figures: VerifiedFigure[];
  /** chars of body, for "how big is this" without loading it. */
  totalChars: number;
}

// ─── PORTS (source-agnostic) ────────────────────────────────────────────────

/** Reaches an exchange's disclosures. All anti-bot/egress quirks live in impls. */
export interface DisclosureFetcher {
  readonly exchange: ExchangeCode;
  readonly tier: SourceTier;
  /** Whether this fetcher is usable right now (e.g. egress key present). */
  isAvailable(): boolean;
  /** List recent disclosures (optionally filtered by category). Refs only. */
  list(opts?: { category?: DisclosureType; sinceISO?: string; limit?: number }): Promise<DisclosureRef[]>;
  /** Fetch one disclosure's full content by native id. */
  fetchDetail(nativeId: string): Promise<FetchedDisclosure>;
}

/** Persists + dedups disclosures. Key = (exchange, dedupKey). */
export interface DisclosureRepository {
  /** True if we've already stored this disclosure (dedup gate). */
  exists(exchange: ExchangeCode, dedupKey: string): Promise<boolean>;
  /**
   * Persist a fetched disclosure: upload PDF to Storage, insert the
   * gcc_disclosure_events row + gcc_verified_figures rows, return the cheap
   * handle. Idempotent on (dedup_key). Releases the body/PDF after upload.
   */
  save(fetched: FetchedDisclosure, figures: VerifiedFigure[]): Promise<CachedDisclosure>;
}

/** Deterministic figure extraction — NO LLM. */
export interface FactExtractor {
  extract(fetched: FetchedDisclosure): VerifiedFigure[];
}
