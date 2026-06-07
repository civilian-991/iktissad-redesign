/**
 * Supabase-backed disclosure repository (plan v4 §2, EDGAR cache-by-native-id).
 *
 * Persists a fetched disclosure into gcc_disclosure_events (dedup-safe via the
 * UNIQUE(dedup_key) constraint from migration 044) and its deterministic figures
 * into gcc_verified_figures (migration 045). Returns the token-cheap
 * CachedDisclosure handle; the heavy body/PDF is uploaded then released.
 *
 * Uses the service-role admin client (bypasses RLS). The generated Database type
 * does not yet include the gcc_* tables, so we use `as any` casts on the query
 * builder — the documented postgrest-js workaround for this project.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type {
  CachedDisclosure, DisclosureRepository, ExchangeCode, FetchedDisclosure, VerifiedFigure,
} from './types';

const STORAGE_BUCKET = 'media';
const STORAGE_PREFIX = 'gcc-disclosures';

export class SupabaseDisclosureRepository implements DisclosureRepository {
  private admin = createAdminClient();
  private exchangeIdCache = new Map<ExchangeCode, string>();

  /** Resolve gcc_exchanges.id from the exchange code (cached). */
  private async exchangeId(code: ExchangeCode): Promise<string> {
    const cached = this.exchangeIdCache.get(code);
    if (cached) return cached;
    const { data, error } = await (this.admin.from('gcc_exchanges') as any)
      .select('id')
      .eq('code', code)
      .single();
    if (error || !data) throw new Error(`Unknown exchange code ${code}: ${error?.message ?? 'not seeded'}`);
    this.exchangeIdCache.set(code, data.id);
    return data.id;
  }

  async exists(exchange: ExchangeCode, dedupKey: string): Promise<boolean> {
    const { data } = await (this.admin.from('gcc_disclosure_events') as any)
      .select('id')
      .eq('dedup_key', dedupKey)
      .maybeSingle();
    return !!data;
  }

  /** Upload PDF bytes to Storage and return the public-ish path. */
  private async uploadPdf(dedupKey: string, bytes: Uint8Array): Promise<string | undefined> {
    const path = `${STORAGE_PREFIX}/${dedupKey.replace(/[^\w.-]/g, '_')}.pdf`;
    const { error } = await this.admin.storage
      .from(STORAGE_BUCKET)
      .upload(path, bytes, { contentType: 'application/pdf', upsert: true });
    if (error) {
      console.error('[gcc] PDF upload failed', error.message);
      return undefined;
    }
    const { data } = this.admin.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  async save(fetched: FetchedDisclosure, figures: VerifiedFigure[]): Promise<CachedDisclosure> {
    const { ref } = fetched;
    const exchange_id = await this.exchangeId(ref.exchange);

    // Persist our own PDF copy when we have the bytes (so the Verifier reads
    // identical bytes); else keep the remote URL reference.
    let pdfStorageUrl = fetched.pdfUrl;
    if (fetched.pdfBytes) {
      pdfStorageUrl = (await this.uploadPdf(ref.dedupKey, fetched.pdfBytes)) ?? fetched.pdfUrl;
    }

    // Idempotent insert: ON CONFLICT (dedup_key) DO NOTHING, then read the row.
    const insertRow = {
      exchange_id,
      type: ref.category ?? 'other',
      title: ref.title,
      body: fetched.bodyText,
      filed_at: ref.filedAt ?? null,
      source_url: ref.url,
      native_id: ref.nativeId,
      pdf_url: pdfStorageUrl ?? null,
      pdf_text: fetched.bodyText?.slice(0, 100_000) ?? null,
      structured: fetched.structured ?? {},
      dedup_key: ref.dedupKey,
      raw: fetched.raw ?? {},
    };

    const { error: insErr } = await (this.admin.from('gcc_disclosure_events') as any)
      .upsert(insertRow, { onConflict: 'dedup_key', ignoreDuplicates: true });
    if (insErr) throw new Error(`save disclosure failed: ${insErr.message}`);

    const { data: row, error: readErr } = await (this.admin.from('gcc_disclosure_events') as any)
      .select('id')
      .eq('dedup_key', ref.dedupKey)
      .single();
    if (readErr || !row) throw new Error(`re-read disclosure failed: ${readErr?.message}`);
    const disclosureEventId: string = row.id;

    // Persist deterministic figures (idempotent on (event, label, period)).
    if (figures.length) {
      const figRows = figures.map((f) => ({
        disclosure_event_id: disclosureEventId,
        label: f.label,
        label_normalized: f.labelNormalized,
        value: f.value,
        unit: f.unit ?? null,
        scale: f.scale ?? null,
        period: f.period ?? null,
        source_span: f.sourceSpan,
        extraction_method: f.extractionMethod,
      }));
      const { error: figErr } = await (this.admin.from('gcc_verified_figures') as any)
        .upsert(figRows, { onConflict: 'disclosure_event_id,label_normalized,period', ignoreDuplicates: true });
      if (figErr) console.error('[gcc] verified_figures upsert failed', figErr.message);
    }

    return {
      exchange: ref.exchange,
      nativeId: ref.nativeId,
      disclosureEventId,
      title: ref.title,
      url: ref.url,
      pdfStorageUrl,
      sourceTier: ref.sourceTier,
      figures,
      totalChars: fetched.bodyText?.length ?? 0,
    };
  }
}
