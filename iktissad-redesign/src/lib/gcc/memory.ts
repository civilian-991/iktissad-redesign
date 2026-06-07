/**
 * Persisted event memory (plan v4 §2.2; research appendix §3 newsflow
 * NewsroomMemory — but in Postgres, not RAM).
 *
 * Before drafting, pull confirmed + DEBUNKED facts for the issuer so the pipeline
 * never re-asserts a previously-debunked claim and can lean on prior confirmed
 * facts. After verification, write supported claims back as confirmed and
 * contradicted claims as debunked. Compounding trust asset across a GCC newsroom.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeArabic } from '@/lib/i18n/arabic-normalize';

export interface EventMemory {
  confirmedFacts: string[];
  debunkedClaims: string[];
  persons: string[];
}

const EMPTY: EventMemory = { confirmedFacts: [], debunkedClaims: [], persons: [] };

function uniqMerge(a: string[], b: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of [...a, ...b]) {
    const key = normalizeArabic(x);
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(x);
    }
  }
  return out;
}

/** Pull merged memory for an issuer (by company) — newest rows first. */
export async function getEventMemory(companyId: string | null): Promise<EventMemory> {
  if (!companyId) return EMPTY;
  const admin = createAdminClient();
  const { data } = await (admin.from('gcc_event_memory') as any)
    .select('confirmed_facts, debunked_claims, persons')
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false })
    .limit(10);
  const rows = (data ?? []) as any[];
  return rows.reduce<EventMemory>(
    (acc, r) => ({
      confirmedFacts: uniqMerge(acc.confirmedFacts, r.confirmed_facts ?? []),
      debunkedClaims: uniqMerge(acc.debunkedClaims, r.debunked_claims ?? []),
      persons: uniqMerge(acc.persons, r.persons ?? []),
    }),
    EMPTY
  );
}

/** Render memory as an Arabic prompt block for the Researcher/Writer. */
export function formatMemoryForPrompt(mem: EventMemory): string {
  if (!mem.confirmedFacts.length && !mem.debunkedClaims.length) return '';
  const parts: string[] = ['ذاكرة سابقة عن هذه الجهة (استند إليها ولا تناقضها):'];
  if (mem.confirmedFacts.length) {
    parts.push('حقائق مؤكدة سابقاً:\n' + mem.confirmedFacts.map((f) => `- ${f}`).join('\n'));
  }
  if (mem.debunkedClaims.length) {
    parts.push('ادعاءات مُفنَّدة سابقاً (ممنوع تكرارها كحقيقة):\n' + mem.debunkedClaims.map((f) => `- ${f}`).join('\n'));
  }
  return parts.join('\n\n');
}

export interface WriteMemoryParams {
  companyId: string | null;
  eventType?: string | null;
  titleHash?: string | null;
  confirmedFacts?: string[];
  debunkedClaims?: string[];
  persons?: string[];
  occurredAt?: string | null;
}

/**
 * Upsert memory for an issuer+event_type: merge into the existing row if present,
 * else insert. No-ops when there's nothing to write or no company anchor.
 */
export async function writeEventMemory(p: WriteMemoryParams): Promise<void> {
  if (!p.companyId) return;
  const incoming = {
    confirmed: p.confirmedFacts ?? [],
    debunked: p.debunkedClaims ?? [],
    persons: p.persons ?? [],
  };
  if (!incoming.confirmed.length && !incoming.debunked.length && !incoming.persons.length) return;

  const admin = createAdminClient();
  const { data: existing } = await (admin.from('gcc_event_memory') as any)
    .select('id, confirmed_facts, debunked_claims, persons')
    .eq('company_id', p.companyId)
    .eq('event_type', p.eventType ?? '')
    .maybeSingle();

  if (existing) {
    await (admin.from('gcc_event_memory') as any)
      .update({
        confirmed_facts: uniqMerge(existing.confirmed_facts ?? [], incoming.confirmed),
        debunked_claims: uniqMerge(existing.debunked_claims ?? [], incoming.debunked),
        persons: uniqMerge(existing.persons ?? [], incoming.persons),
      })
      .eq('id', existing.id);
  } else {
    await (admin.from('gcc_event_memory') as any).insert({
      company_id: p.companyId,
      event_type: p.eventType ?? '',
      title_hash: p.titleHash ?? null,
      confirmed_facts: incoming.confirmed,
      debunked_claims: incoming.debunked,
      persons: incoming.persons,
      occurred_at: p.occurredAt ?? null,
    });
  }
}
