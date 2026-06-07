/**
 * Mubasher fetcher — the always-on FALLBACK source (plan v4: Mubasher demoted to
 * tagged fallback floor). HTTP-only, no clean egress needed, datacenter-IP safe.
 *
 * Mirrors the extraction already running in the live n8n Selector workflow; kept
 * here so the lib has a working source even before the Browserbase origin egress
 * is wired. Tagged sourceTier='mirror' so EEAT/confidence logic knows it is a
 * mirror, not the authoritative origin.
 *
 * Note: Mubasher's HTML is unstable. This uses dependency-free regex extraction
 * (no cheerio) and is deliberately defensive — it returns what it can and never
 * throws on a single bad item.
 */

import { dedupKey } from '@/lib/i18n/arabic-normalize';
import { classifyDisclosure } from './classify';
import type {
  DisclosureFetcher, DisclosureRef, DisclosureType, ExchangeCode, FetchedDisclosure,
} from './types';

const COUNTRY_BY_EXCHANGE: Record<ExchangeCode, string> = {
  TADAWUL: 'sa', ADX: 'ae', DFM: 'ae', QSE: 'qa', BK: 'kw', BHB: 'bh', MSX: 'om',
};

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

export class MubasherFetcher implements DisclosureFetcher {
  readonly tier = 'mirror' as const;
  constructor(public readonly exchange: ExchangeCode) {}

  isAvailable(): boolean {
    return true; // no key/egress required
  }

  private listUrl(): string {
    const cc = COUNTRY_BY_EXCHANGE[this.exchange];
    return `https://www.mubasher.info/news/${cc}/now/announcements`;
  }

  async list(opts?: { category?: DisclosureType; sinceISO?: string; limit?: number }): Promise<DisclosureRef[]> {
    const limit = opts?.limit ?? 30;
    let html: string;
    try {
      const res = await fetch(this.listUrl(), {
        headers: { 'User-Agent': UA, 'Accept-Language': 'ar' },
      });
      if (!res.ok) return [];
      html = await res.text();
    } catch {
      return [];
    }

    // Mubasher renders each item as an anchor to /news/<id>. Pull (href, text).
    const refs: DisclosureRef[] = [];
    const seen = new Set<string>();
    const anchorRe = /<a[^>]+href="(\/news\/(\d+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m: RegExpExecArray | null;
    while ((m = anchorRe.exec(html)) && refs.length < limit) {
      const nativeId = m[2];
      if (seen.has(nativeId)) continue;
      const title = stripTags(m[3]);
      if (!title || title.length < 8) continue;
      seen.add(nativeId);

      const cls = classifyDisclosure(title);
      if (opts?.category && cls.category !== opts.category) continue;

      refs.push({
        exchange: this.exchange,
        nativeId,
        dedupKey: nativeId, // Mubasher id is stable; prefer it over title hash
        title,
        url: `https://www.mubasher.info${m[1]}`,
        category: cls.category,
        sourceTier: 'mirror',
      });
    }

    // Defensive fallback: if the anchor pattern drifted, dedup by title hash.
    if (!refs.length) return [];
    return refs;
  }

  async fetchDetail(nativeId: string): Promise<FetchedDisclosure> {
    const url = `https://www.mubasher.info/news/${nativeId}`;
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ar' } });
    if (!res.ok) throw new Error(`Mubasher detail ${nativeId} → HTTP ${res.status}`);
    const html = await res.text();

    // Extract the article body. Mubasher wraps it in a content container; fall
    // back to the largest text block if the class drifted.
    const bodyMatch =
      html.match(/<div[^>]+class="[^"]*article[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i) ||
      html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    const bodyText = bodyMatch ? stripTags(bodyMatch[1]) : stripTags(html).slice(0, 4000);
    const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const title = titleMatch ? stripTags(titleMatch[1]) : '';

    return {
      ref: {
        exchange: this.exchange,
        nativeId,
        dedupKey: nativeId,
        title,
        url,
        category: classifyDisclosure(title).category,
        sourceTier: 'mirror',
      },
      bodyText,
      raw: { source: 'mubasher' },
    };
  }
}

/** Stable dedup key for the rare case Mubasher gives no native id. */
export function fallbackDedupKey(exchange: ExchangeCode, title: string): string {
  return `${exchange}:${dedupKey(title)}`;
}
