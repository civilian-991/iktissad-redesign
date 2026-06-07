/**
 * Live full-pipeline eval (MANUAL — needs AI_GATEWAY_API_KEY; makes LLM calls).
 *
 * Runs the deep pipeline against the golden disclosures and scores each draft:
 * verifier publishable? banned phrases? required phrases present? Use before
 * promoting a prompt change (plan v4 §2.5). Network-bound, so it is NOT a CI
 * gate — the deterministic gate is src/lib/gcc/eval/golden.test.ts.
 *
 *   AI_GATEWAY_API_KEY=... npx tsx scripts/gcc-eval/run-live.ts
 */

import { ruleFactExtractor } from '@/lib/gcc/sourcing/fact-extractor';
import type { FetchedDisclosure } from '@/lib/gcc/sourcing/types';
import { runPipeline } from '@/lib/gcc/pipeline';
import { GOLDEN_CASES } from '@/lib/gcc/eval/golden';
import { scoreDraftText } from '@/lib/gcc/eval/scorer';

async function main() {
  if (!process.env.AI_GATEWAY_API_KEY) {
    console.error('Set AI_GATEWAY_API_KEY to run the live eval.');
    process.exit(1);
  }

  let passed = 0;
  for (const c of GOLDEN_CASES) {
    const fetched: FetchedDisclosure = {
      ref: { exchange: 'TADAWUL', nativeId: c.id, dedupKey: c.id, title: '', url: '', category: c.category as any, sourceTier: 'origin' },
      bodyText: c.disclosureText,
    };
    const figures = ruleFactExtractor.extract(fetched);

    const result = await runPipeline({
      issuer: { nameAr: 'الشركة', exchange: 'تداول' },
      disclosureText: c.disclosureText,
      cached: {
        exchange: 'TADAWUL', nativeId: c.id, disclosureEventId: c.id, title: '', url: '',
        sourceTier: 'origin', figures, totalChars: c.disclosureText.length,
      },
    });

    const body = result.article?.bodyMd ?? '';
    const textScore = scoreDraftText(c, body);
    const ok = !!result.article && result.publishable && textScore.passed;
    if (ok) passed++;

    console.log(`\n=== ${c.id} (${c.category}) ===`);
    console.log(`  article: ${result.article ? 'yes' : 'NO — ' + result.error}`);
    console.log(`  publishable: ${result.publishable}  blockers: ${result.blockers.join('; ') || 'none'}`);
    console.log(`  text issues: ${textScore.issues.join('; ') || 'none'}`);
    console.log(`  verdict: ${ok ? 'PASS' : 'FAIL'}`);
  }
  console.log(`\n${passed}/${GOLDEN_CASES.length} golden cases passed.`);
  process.exit(passed === GOLDEN_CASES.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
