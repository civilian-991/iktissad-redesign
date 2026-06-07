/**
 * Persist a pipeline run into the trust-layer tables (plan v4 §2.2).
 *
 * Writes: gcc_story_budget → gcc_generated_articles → gcc_claim_cards →
 * gcc_agent_runs → gcc_review_bundles (active snapshot + hash). Uses the admin
 * client (`as any` casts — gcc_* not in the generated Database type yet).
 */

import { createHash } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PipelineResult } from './index';

export interface PersistContext {
  disclosureEventId: string;
  category?: string;
  angle?: string;
  runId: string;
}

export interface PersistResult {
  storyBudgetId: string;
  generatedArticleId: string;
  reviewBundleId: string;
  claimCount: number;
}

function sha256(obj: unknown): string {
  return createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}

export async function persistDraft(ctx: PersistContext, result: PipelineResult): Promise<PersistResult> {
  if (!result.article) throw new Error('cannot persist: pipeline produced no article');
  const admin = createAdminClient();

  // 1. story budget (the assignment)
  const { data: budget, error: budgetErr } = await (admin.from('gcc_story_budget') as any)
    .insert({
      run_id: ctx.runId,
      assignment: { disclosure_event_id: ctx.disclosureEventId, angle: ctx.angle ?? '' },
      story_type: ctx.category ?? null,
      status: 'drafted',
    })
    .select('id')
    .single();
  if (budgetErr || !budget) throw new Error(`story_budget insert failed: ${budgetErr?.message}`);
  const storyBudgetId: string = budget.id;

  // 2. generated article (draft + fact-check summary live here pre-approval)
  const factCheck = {
    publishable: result.publishable,
    blockers: result.blockers,
    verdict_counts: result.verdicts.reduce<Record<string, number>>((acc, v) => {
      acc[v.status] = (acc[v.status] ?? 0) + 1;
      return acc;
    }, {}),
  };
  const draftJson = {
    title: result.article.title,
    deck: result.article.deck,
    body_md: result.article.bodyMd,
    tldr: result.article.tldr,
    key_points: result.article.keyPoints,
    what_next: result.article.whatNext,
    meta_title: result.article.metaTitle,
    meta_description: result.article.metaDescription,
    slug: result.article.slug,
    tags: result.article.tags,
    secondary_keywords: result.article.secondaryKeywords,
  };
  const { data: gen, error: genErr } = await (admin.from('gcc_generated_articles') as any)
    .insert({
      story_budget_id: storyBudgetId,
      edition: 'ar',
      draft: draftJson,
      fact_check: factCheck,
      provenance: { disclosure_event_id: ctx.disclosureEventId },
      confidence:
        result.verdicts.length > 0
          ? result.verdicts.reduce((s, v) => s + v.confidenceScore, 0) / result.verdicts.length
          : null,
      status: result.publishable ? 'pending_review' : 'needs_changes',
    })
    .select('id')
    .single();
  if (genErr || !gen) throw new Error(`generated_article insert failed: ${genErr?.message}`);
  const generatedArticleId: string = gen.id;

  // 3. claim cards (one row per verified claim)
  if (result.verdicts.length) {
    const rows = result.verdicts.map((v) => ({
      generated_article_id: generatedArticleId,
      disclosure_event_id: ctx.disclosureEventId,
      claim_text: v.claimText,
      claim_type: v.claimType,
      status: v.status,
      supporting_evidence: v.supportingEvidence,
      contradicting_evidence: v.contradictingEvidence,
      missing_evidence: v.missingEvidence,
      confidence_score: v.confidenceScore,
      source_tier: v.sourceTier,
      draft_anchor_ref: v.anchorRef ?? null,
      reasoning: v.reasoning,
      verified_by: 'verifier',
    }));
    const { error: ccErr } = await (admin.from('gcc_claim_cards') as any).insert(rows);
    if (ccErr) console.error('[gcc] claim_cards insert failed', ccErr.message);
  }

  // 4. agent runs (cost/latency ledger)
  if (result.runs.length) {
    const runRows = result.runs.map((r) => ({
      run_id: ctx.runId,
      agent: r.agent,
      model: r.model,
      tokens_in: r.tokensIn,
      tokens_out: r.tokensOut,
      duration_ms: r.latencyMs,
      status: r.ok ? 'ok' : 'error',
    }));
    const { error: arErr } = await (admin.from('gcc_agent_runs') as any).insert(runRows);
    if (arErr) console.error('[gcc] agent_runs insert failed', arErr.message);
  }

  // 5. review bundle (immutable snapshot + hash; the staleness guard)
  const snapshot = { draft: draftJson, claims: result.verdicts };
  const { data: bundle, error: bundleErr } = await (admin.from('gcc_review_bundles') as any)
    .insert({
      generated_article_id: generatedArticleId,
      draft_version: 1,
      draft_snapshot: draftJson,
      claim_snapshot: result.verdicts,
      risk_snapshot: factCheck,
      bundle_hash: sha256(snapshot),
      status: 'active',
    })
    .select('id')
    .single();
  if (bundleErr || !bundle) throw new Error(`review_bundle insert failed: ${bundleErr?.message}`);

  return {
    storyBudgetId,
    generatedArticleId,
    reviewBundleId: bundle.id,
    claimCount: result.verdicts.length,
  };
}
