/**
 * Deep pipeline orchestrator (plan v4 §2.1): Desk → Researcher (typed parallel
 * analysts) → Writer → SEO → Verifier → Assemble. Produces a complete CMS
 * article object + claim verdicts. Framework-agnostic so an API route or n8n
 * (via that route) can call it.
 *
 * Every LLM call is recorded as an AgentRun (model, tokens, latency) for the
 * gcc_agent_runs ledger + Langfuse. Verification is deterministic-first; nothing
 * with a contradicted/missing number is marked publishable.
 */

import type { CachedDisclosure } from '@/lib/gcc/sourcing/types';
import { complete, parseJsonObject, type CompletionResult } from './gateway';
import { deskPrompt, researcherPrompt, writerPrompt, seoPrompt, type IssuerContext } from './prompts';
import { verifyDraft, type ClaimVerdict, type DraftClaim } from './verifier';

export * from './gateway';
export * from './verifier';
export type { IssuerContext } from './prompts';

export interface PipelineInput {
  issuer: IssuerContext;
  disclosureText: string;
  cached: CachedDisclosure; // carries figures + sourceTier + ids
  /** run the adversarial semantic verification (extra tokens). */
  adversarial?: boolean;
  /** cap researcher personas (cost knob). */
  maxPersonas?: number;
  /** preformatted prior event memory (confirmed + debunked facts) for the issuer. */
  priorMemory?: string;
}

export interface AgentRun {
  agent: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  ok: boolean;
}

export interface CompleteArticle {
  title: string;
  deck: string;
  bodyMd: string;
  tldr: string;
  keyPoints: string[];
  whatNext: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  tags: string[];
  secondaryKeywords: string[];
}

export interface PipelineResult {
  article: CompleteArticle | null;
  claims: DraftClaim[];
  verdicts: ClaimVerdict[];
  publishable: boolean;
  blockers: string[];
  runs: AgentRun[];
  error?: string;
}

function record(runs: AgentRun[], agent: string, r: CompletionResult, ok = true): void {
  runs.push({ agent, model: r.model, tokensIn: r.usage.promptTokens, tokensOut: r.usage.completionTokens, latencyMs: r.latency, ok });
}

export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {
  const { issuer, disclosureText, cached } = input;
  const memoryBlock = input.priorMemory ? `\n\n${input.priorMemory}` : '';
  const runs: AgentRun[] = [];
  const result: PipelineResult = {
    article: null, claims: [], verdicts: [], publishable: false, blockers: [], runs,
  };

  try {
    // 1. Desk — angle + personas (reasoning tier)
    let personas = ['محلل أسهم', 'متخصص حوكمة', 'الكاتب الأساسي للوقائع'];
    let angle = '';
    try {
      const desk = await complete(
        [{ role: 'system', content: deskPrompt(issuer) },
         { role: 'user', content: `الإفصاح:\n"""${disclosureText.slice(0, 6000)}"""` }],
        { tier: 'reasoning', temperature: 0.2, json: true, maxTokens: 500 }
      );
      record(runs, 'desk', desk);
      const plan = parseJsonObject<{ angle?: string; personas?: string[] }>(desk.text);
      if (plan?.personas?.length) personas = plan.personas;
      if (plan?.angle) angle = plan.angle;
    } catch (e) {
      // non-fatal: proceed with default personas
      runs.push({ agent: 'desk', model: 'n/a', tokensIn: 0, tokensOut: 0, latencyMs: 0, ok: false });
    }

    // 2. Researcher — typed parallel analysts (strong tier)
    const chosen = personas.slice(0, input.maxPersonas ?? 3);
    const findings: { fact: string; source_ref: string }[] = [];
    const research = await Promise.all(
      chosen.map(async (persona) => {
        try {
          const r = await complete(
            [{ role: 'system', content: researcherPrompt(issuer, persona) },
             { role: 'user', content: `الإفصاح:\n"""${disclosureText.slice(0, 6000)}"""${memoryBlock}` }],
            { tier: 'strong', temperature: 0.2, json: true, maxTokens: 700 }
          );
          record(runs, `researcher:${persona}`, r);
          return parseJsonObject<{ findings?: { fact: string; source_ref: string }[] }>(r.text)?.findings ?? [];
        } catch {
          runs.push({ agent: `researcher:${persona}`, model: 'n/a', tokensIn: 0, tokensOut: 0, latencyMs: 0, ok: false });
          return [];
        }
      })
    );
    research.forEach((f) => findings.push(...f));

    // 3. Writer — full article + claims (writer tier). Fatal if it fails.
    const researchBlock = findings.map((f, i) => `${i + 1}. ${f.fact}`).join('\n') || 'لا سياق إضافي.';
    const writerRes = await complete(
      [{ role: 'system', content: writerPrompt(issuer) },
       { role: 'user', content:
          `الزاوية: ${angle || 'حسب أهمية الخبر'}\n\nالإفصاح الرسمي:\n"""${disclosureText.slice(0, 6000)}"""\n\nالوقائع المُجمّعة:\n${researchBlock}${memoryBlock}` }],
      { tier: 'writer', temperature: 0.35, json: true, maxTokens: 5000 }
    );
    record(runs, 'writer', writerRes);
    const draft = parseJsonObject<any>(writerRes.text);
    if (!draft?.title || !draft?.body_md) {
      result.error = 'Writer did not return a usable draft';
      return result;
    }
    const claims: DraftClaim[] = (draft.claims ?? []).map((c: any) => ({
      text: String(c.text ?? ''), type: c.type, anchorRef: c.anchor,
    })).filter((c: DraftClaim) => c.text);
    result.claims = claims;

    // 4. SEO — metadata (strong tier). Non-fatal.
    let seo: any = {};
    try {
      const seoRes = await complete(
        [{ role: 'system', content: seoPrompt(issuer) },
         { role: 'user', content: `العنوان: ${draft.title}\nالمتن:\n"""${String(draft.body_md).slice(0, 4000)}"""` }],
        { tier: 'strong', temperature: 0.3, json: true, maxTokens: 500 }
      );
      record(runs, 'seo', seoRes);
      seo = parseJsonObject<any>(seoRes.text) ?? {};
    } catch {
      runs.push({ agent: 'seo', model: 'n/a', tokensIn: 0, tokensOut: 0, latencyMs: 0, ok: false });
    }

    // 5. Verifier — deterministic-first
    const verify = await verifyDraft({
      claims,
      figures: cached.figures,
      disclosureText,
      sourceTier: cached.sourceTier,
      adversarial: input.adversarial,
    });
    result.verdicts = verify.verdicts;
    result.publishable = verify.publishable;
    result.blockers = verify.blockers;

    // 6. Assemble
    result.article = {
      title: draft.title,
      deck: draft.deck ?? '',
      bodyMd: draft.body_md,
      tldr: draft.tldr ?? '',
      keyPoints: draft.key_points ?? [],
      whatNext: draft.what_next ?? '',
      metaTitle: seo.meta_title ?? draft.title,
      metaDescription: seo.meta_description ?? draft.tldr ?? '',
      slug: seo.slug ?? '',
      tags: seo.tags ?? [],
      secondaryKeywords: seo.secondary_keywords ?? [],
    };

    return result;
  } catch (e) {
    result.error = e instanceof Error ? e.message : String(e);
    return result;
  }
}
