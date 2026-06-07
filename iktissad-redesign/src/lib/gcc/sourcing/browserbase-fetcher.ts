/**
 * Tadawul ORIGIN fetcher via a managed browser with a Saudi residential IP.
 *
 * THIS IS THE KEYSTONE (plan v4 §6). It is the only component blocked on you:
 * it needs a Browserbase account + API key (or a self-hosted Patchright box).
 * Everything else in the pipeline runs today on the Mubasher fallback.
 *
 * WHY a managed browser (research appendix §11, with real benchmark numbers):
 *   - saudiexchange.sa is behind Akamai Bot Manager; our datacenter IP is banned
 *     domain-wide (proven 403). Only 3 of 23 browser engines beat Akamai in the
 *     benchmark, and a clean residential IP is non-negotiable.
 *   - Akamai requires a valid `_abck` sensor cookie that can only be minted by
 *     executing its JS in a REAL browser, plus a genuine TLS fingerprint.
 *   - A managed browser (Browserbase) solves fingerprint + Saudi IP + _abck in
 *     one session: `proxies:[{type:'browserbase', geolocation:{country:'SA'}}]`,
 *     `advancedStealth:true`, region `ap-southeast-1`.
 *
 * THE FLOW once configured:
 *   1. Create a Browserbase session (Saudi geo + stealth).
 *   2. Connect via CDP (Playwright) and navigate to a Tadawul page to mint _abck.
 *   3. `page.evaluate(fetch(...))` the announcements JSON IN the browser context
 *      (reuses the valid cookie + real TLS) — getAnnouncementListData, then
 *      detail by anId; category 1_23 = board/exec changes.
 *   4. Return refs / full detail; the repository persists + extracts facts.
 *
 * TO ENABLE:
 *   - npm i @browserbasehq/sdk playwright-core
 *   - set BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID
 *   - (optional) TADAWUL_ANNOUNCEMENTS_URL / TADAWUL_DETAIL_URL overrides
 * Until then isAvailable() is false and the orchestrator uses Mubasher.
 */

import { classifyDisclosure } from './classify';
import type {
  DisclosureFetcher, DisclosureRef, DisclosureType, ExchangeCode, FetchedDisclosure,
} from './types';

const ENABLED = !!(process.env.BROWSERBASE_API_KEY && process.env.BROWSERBASE_PROJECT_ID);

// Tadawul's public JSON surface (see memory: tadawul-announcements-api). The site
// is an IBM WebSphere portal; these are the underlying data endpoints reached
// from inside an authenticated browser context. Overridable via env.
const ANNOUNCEMENTS_URL =
  process.env.TADAWUL_ANNOUNCEMENTS_URL ??
  'https://www.saudiexchange.sa/wps/portal/saudiexchange/newsandreports/issuer-news/issuer-announcements';
const PRIME_URL =
  process.env.TADAWUL_PRIME_URL ?? 'https://www.saudiexchange.sa/wps/portal/saudiexchange/home';

function notConfigured(): never {
  throw new Error(
    '[TadawulFetcher] origin egress not configured. ' +
      'Set BROWSERBASE_API_KEY + BROWSERBASE_PROJECT_ID and install ' +
      '`@browserbasehq/sdk` + `playwright-core`. See plan v4 §6 and ' +
      'docs/gcc-markets-newsroom-research-appendix.md §11. Falling back to Mubasher.'
  );
}

export class TadawulOriginFetcher implements DisclosureFetcher {
  readonly exchange = 'TADAWUL' as const;
  readonly tier = 'origin' as const;

  isAvailable(): boolean {
    return ENABLED;
  }

  /**
   * Open a stealth Saudi-geo browser session, prime cookies on a Tadawul page so
   * Akamai issues a valid `_abck`, and return a connected Playwright page. The
   * dynamic import keeps the dep optional so the rest of the app builds without it.
   */
  private async openSession(): Promise<{ page: any; close: () => Promise<void> }> {
    if (!ENABLED) notConfigured();
    // Runtime-only import via new Function so the bundler (Turbopack) does NOT
    // try to resolve these optional deps at build time. They load only when
    // Browserbase is configured (and installed).
    const runtimeImport = new Function('m', 'return import(m)') as (m: string) => Promise<any>;
    const { Browserbase } = await runtimeImport('@browserbasehq/sdk').catch(notConfigured);
    const { chromium } = await runtimeImport('playwright-core').catch(notConfigured);

    const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY! });
    const session = await bb.sessions.create({
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
      region: 'ap-southeast-1',
      browserSettings: { advancedStealth: true, solveCaptchas: true },
      proxies: [{ type: 'browserbase', geolocation: { country: 'SA' } }],
    });

    const browser = await chromium.connectOverCDP(session.connectUrl);
    const ctx = browser.contexts()[0] ?? (await browser.newContext());
    await ctx.setExtraHTTPHeaders({ 'Accept-Language': 'ar' });
    const page = ctx.pages()[0] ?? (await ctx.newPage());

    // Prime: load a Tadawul page so Akamai's sensor JS runs and mints _abck.
    await page.goto(PRIME_URL, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.waitForTimeout(2500);

    return { page, close: () => browser.close() };
  }

  /** Run a fetch() INSIDE the browser context (reuses _abck + real TLS). */
  private async fetchInPage(page: any, url: string): Promise<any> {
    return page.evaluate(async (u: string) => {
      const r = await fetch(u, { headers: { Accept: 'application/json', 'Accept-Language': 'ar' } });
      const text = await r.text();
      try {
        return { ok: r.ok, status: r.status, json: JSON.parse(text) };
      } catch {
        return { ok: r.ok, status: r.status, html: text };
      }
    }, url);
  }

  async list(opts?: { category?: DisclosureType; sinceISO?: string; limit?: number }): Promise<DisclosureRef[]> {
    const { page, close } = await this.openSession();
    try {
      const resp = await this.fetchInPage(page, ANNOUNCEMENTS_URL);
      if (!resp?.ok) throw new Error(`Tadawul announcements → HTTP ${resp?.status}`);

      // Tadawul's getAnnouncementListData shape varies; normalize defensively.
      // Each item carries an `anId` (native id), title, date, and disclosure code.
      const rows: any[] = resp.json?.data ?? resp.json?.announcements ?? resp.json ?? [];
      const limit = opts?.limit ?? 30;
      const refs: DisclosureRef[] = [];

      for (const row of Array.isArray(rows) ? rows : []) {
        const nativeId = String(row.anId ?? row.id ?? row.announcementId ?? '');
        const title = String(row.title ?? row.headline ?? row.subject ?? '').trim();
        if (!nativeId || !title) continue;
        const cls = classifyDisclosure(title);
        if (opts?.category && cls.category !== opts.category) continue;
        refs.push({
          exchange: 'TADAWUL',
          nativeId,
          dedupKey: `TADAWUL:${nativeId}`,
          title,
          url: `${ANNOUNCEMENTS_URL}?anId=${nativeId}`,
          filedAt: row.date ?? row.publishDate,
          category: cls.category,
          sourceTier: 'origin',
        });
        if (refs.length >= limit) break;
      }
      return refs;
    } finally {
      await close();
    }
  }

  async fetchDetail(nativeId: string): Promise<FetchedDisclosure> {
    const { page, close } = await this.openSession();
    try {
      const detailUrl =
        (process.env.TADAWUL_DETAIL_URL ?? `${ANNOUNCEMENTS_URL}?anId=`) + nativeId;
      const resp = await this.fetchInPage(page, detailUrl);
      if (!resp?.ok) throw new Error(`Tadawul detail ${nativeId} → HTTP ${resp?.status}`);

      const d = resp.json ?? {};
      const title = String(d.title ?? d.headline ?? '').trim();
      const bodyText = String(d.body ?? d.details ?? d.disclosureBody ?? '').trim();
      const pdfUrl = d.pdfUrl ?? d.attachmentUrl;

      // Completeness guard (research appendix §7): an empty extract often means we
      // fetched an Akamai challenge page, not real data.
      if (!title && !bodyText) {
        throw new Error(`Tadawul detail ${nativeId} returned no content (possible Akamai block)`);
      }

      return {
        ref: {
          exchange: 'TADAWUL',
          nativeId,
          dedupKey: `TADAWUL:${nativeId}`,
          title,
          url: detailUrl,
          category: classifyDisclosure(title).category,
          sourceTier: 'origin',
        },
        bodyText,
        pdfUrl,
        structured: d,
        raw: { source: 'tadawul_origin' },
      };
    } finally {
      await close();
    }
  }
}
