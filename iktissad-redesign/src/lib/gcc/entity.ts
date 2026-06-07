/**
 * Issuer entity resolution (plan v4 Phase 3; research appendix §13).
 *
 * Resolves an NER-extracted ORG name to a gcc_companies row via the normalized
 * alias table (gcc_company_aliases.alias_normalized, built with the same
 * normalizer). Exact-normalized match first, then a fuzzy contains-match. A miss
 * returns null so the caller can queue the disclosure for human review rather
 * than auto-creating a bad company row.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeArabic } from '@/lib/i18n/arabic-normalize';
import { extractOrgs } from './ner-client';

export interface IssuerMatch {
  companyId: string;
  confidence: number; // 1.0 exact, ~0.6 fuzzy
  method: 'alias_exact' | 'alias_fuzzy' | 'name_exact';
  matchedOn: string;
}

/** Resolve a single org name to a company. Null = no confident match. */
export async function resolveIssuer(orgName: string, exchangeId?: string): Promise<IssuerMatch | null> {
  const norm = normalizeArabic(orgName);
  if (!norm) return null;
  const admin = createAdminClient();

  // 1. Exact normalized alias match.
  let q = (admin.from('gcc_company_aliases') as any).select('company_id, alias_normalized').eq('alias_normalized', norm);
  if (exchangeId) q = q.eq('exchange_id', exchangeId);
  const { data: exact } = await q.limit(1).maybeSingle();
  if (exact?.company_id) {
    return { companyId: exact.company_id, confidence: 1, method: 'alias_exact', matchedOn: norm };
  }

  // 2. Fuzzy: alias contains the normalized name (or vice versa). Cheap, no RPC.
  let fq = (admin.from('gcc_company_aliases') as any)
    .select('company_id, alias_normalized')
    .ilike('alias_normalized', `%${norm}%`);
  if (exchangeId) fq = fq.eq('exchange_id', exchangeId);
  const { data: fuzzy } = await fq.limit(5);
  if (fuzzy?.length) {
    // prefer the shortest alias (tightest match)
    const best = [...fuzzy].sort((a: any, b: any) => a.alias_normalized.length - b.alias_normalized.length)[0];
    return { companyId: best.company_id, confidence: 0.6, method: 'alias_fuzzy', matchedOn: best.alias_normalized };
  }

  return null;
}

/**
 * Resolve + persist the issuer for a disclosure: NER the text, resolve the first
 * confident ORG, set gcc_disclosure_events.company_id, and record the alias so
 * future matches are exact. Returns the match (or null on miss).
 */
export async function linkDisclosureIssuer(disclosureEventId: string): Promise<IssuerMatch | null> {
  const admin = createAdminClient();
  const { data: disc } = await (admin.from('gcc_disclosure_events') as any)
    .select('id, exchange_id, company_id, title, body')
    .eq('id', disclosureEventId)
    .single();
  if (!disc) return null;
  if (disc.company_id) return null; // already linked

  const orgs = await extractOrgs(`${disc.title ?? ''}\n${disc.body ?? ''}`);
  for (const org of orgs) {
    const match = await resolveIssuer(org, disc.exchange_id);
    if (match) {
      await (admin.from('gcc_disclosure_events') as any)
        .update({ company_id: match.companyId })
        .eq('id', disclosureEventId);
      // Record the surface form as an alias for next time (best-effort).
      await (admin.from('gcc_company_aliases') as any)
        .upsert(
          {
            company_id: match.companyId,
            exchange_id: disc.exchange_id,
            alias_normalized: normalizeArabic(org),
            lang: 'ar',
            source: 'ner',
          },
          { onConflict: 'exchange_id,alias_normalized', ignoreDuplicates: true }
        );
      return match;
    }
  }
  return null; // miss → caller queues for human review
}
