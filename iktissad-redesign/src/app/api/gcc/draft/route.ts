/**
 * POST /api/gcc/draft — run the deep pipeline for a screened disclosure.
 *
 * Called by the n8n Responder when the editor taps ✍️ (secret-header auth).
 * Loads the disclosure + its deterministic figures + issuer context, runs
 * Desk→Researcher→Writer→SEO→Verifier→Assemble, persists the trust-layer rows,
 * and returns the draft + verdicts for the Telegram review card.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkGccSecret } from '@/lib/gcc/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { runPipeline, type IssuerContext } from '@/lib/gcc/pipeline';
import { persistDraft } from '@/lib/gcc/pipeline/persist';
import { getEventMemory, formatMemoryForPrompt, writeEventMemory } from '@/lib/gcc/memory';
import type { VerifiedFigure, SourceTier } from '@/lib/gcc/sourcing/types';

const schema = z.object({
  disclosureEventId: z.string().uuid(),
  adversarial: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const denied = checkGccSecret(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(', ') },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { disclosureEventId } = parsed.data;

  // 1. Load disclosure + exchange + company.
  const { data: disc, error: discErr } = await (admin.from('gcc_disclosure_events') as any)
    .select(
      '*, gcc_exchanges:exchange_id ( code, name ), gcc_companies:company_id ( name, name_en, ticker, sector_id )'
    )
    .eq('id', disclosureEventId)
    .single();
  if (discErr || !disc) {
    return NextResponse.json({ error: `disclosure not found: ${discErr?.message ?? ''}` }, { status: 404 });
  }

  // 2. Load deterministic figures (the Verifier's ground truth).
  const { data: figRows } = await (admin.from('gcc_verified_figures') as any)
    .select('*')
    .eq('disclosure_event_id', disclosureEventId);
  const figures: VerifiedFigure[] = ((figRows ?? []) as any[]).map((f) => ({
    label: f.label,
    labelNormalized: f.label_normalized,
    value: Number(f.value),
    unit: f.unit ?? undefined,
    scale: f.scale ?? undefined,
    period: f.period ?? undefined,
    sourceSpan: f.source_span ?? '',
    extractionMethod: f.extraction_method ?? 'rule',
  }));

  // 3. Issuer context (identity-pinning).
  const issuer: IssuerContext = {
    nameAr: disc.gcc_companies?.name ?? disc.title ?? 'الجهة المُصدِرة',
    nameEn: disc.gcc_companies?.name_en ?? undefined,
    ticker: disc.gcc_companies?.ticker ?? undefined,
    exchange: disc.gcc_exchanges?.name ?? disc.gcc_exchanges?.code ?? '',
  };
  const sourceTier: SourceTier =
    (disc.raw?.source === 'tadawul_origin') ? 'origin' : 'mirror';
  const disclosureText: string = disc.body ?? disc.pdf_text ?? disc.title ?? '';

  // 3b. Prior event memory (never re-assert a debunked claim).
  const companyId: string | null = disc.company_id ?? null;
  const priorMemory = formatMemoryForPrompt(await getEventMemory(companyId));

  // 4. Run the pipeline.
  const result = await runPipeline({
    issuer,
    disclosureText,
    adversarial: parsed.data.adversarial,
    priorMemory,
    cached: {
      exchange: disc.gcc_exchanges?.code ?? 'TADAWUL',
      nativeId: disc.native_id ?? '',
      disclosureEventId,
      title: disc.title ?? '',
      url: disc.source_url ?? '',
      sourceTier,
      figures,
      totalChars: disclosureText.length,
    },
  });

  if (!result.article) {
    return NextResponse.json({ error: result.error ?? 'pipeline failed' }, { status: 502 });
  }

  // 5. Persist trust-layer rows.
  let persisted;
  try {
    persisted = await persistDraft(
      { disclosureEventId, category: disc.type, runId: `draft-${disclosureEventId}`, angle: '' },
      result
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'persist failed', article: result.article },
      { status: 500 }
    );
  }

  // 5b. Write event memory: supported claims → confirmed, contradicted → debunked.
  try {
    await writeEventMemory({
      companyId,
      eventType: disc.type,
      confirmedFacts: result.verdicts.filter((v) => v.status === 'supported').map((v) => v.claimText),
      debunkedClaims: result.verdicts.filter((v) => v.status === 'contradicted').map((v) => v.claimText),
    });
  } catch (e) {
    console.error('[gcc] event memory write failed', e);
  }

  // 6. Return the draft + verdicts for the Telegram card.
  return NextResponse.json({
    data: {
      ...persisted,
      article: result.article,
      publishable: result.publishable,
      blockers: result.blockers,
      verdicts: result.verdicts,
    },
  });
}
