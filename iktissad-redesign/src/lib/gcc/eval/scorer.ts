/**
 * Deterministic scorers for the regression harness (plan v4 §2.5).
 * Network-free: exercises the rule extractor + the banned-phrase guard so it can
 * gate CI. (Full-pipeline scoring with an LLM judge is the manual live script.)
 */

import { ruleFactExtractor } from '@/lib/gcc/sourcing/fact-extractor';
import type { FetchedDisclosure } from '@/lib/gcc/sourcing/types';
import { normalizeArabic } from '@/lib/i18n/arabic-normalize';
import { countBannedPhrases, type GoldenCase } from './golden';

export interface ExtractionScore {
  id: string;
  figureCoverage: number; // 0..1 of requiredFigures the extractor found (by value)
  foundValues: number[];
  missing: { label: string; value: number }[];
  passed: boolean;
}

function approxEqual(a: number, b: number): boolean {
  const denom = Math.max(Math.abs(a), Math.abs(b), 1e-9);
  return Math.abs(a - b) / denom <= 0.01;
}

/** Score the deterministic figure extractor against a golden case. */
export function scoreExtraction(c: GoldenCase): ExtractionScore {
  const fetched: FetchedDisclosure = {
    ref: {
      exchange: 'TADAWUL', nativeId: c.id, dedupKey: c.id, title: '',
      url: '', category: c.category as any, sourceTier: 'origin',
    },
    bodyText: c.disclosureText,
  };
  const figures = ruleFactExtractor.extract(fetched);
  const foundValues = figures.map((f) => f.value);

  const missing = c.requiredFigures.filter((rf) => !foundValues.some((v) => approxEqual(v, rf.value)));
  const coverage = c.requiredFigures.length === 0
    ? 1
    : (c.requiredFigures.length - missing.length) / c.requiredFigures.length;

  return {
    id: c.id,
    figureCoverage: coverage,
    foundValues,
    missing,
    passed: coverage >= 1, // every required figure must be found
  };
}

/** A faithful draft must contain required phrases and zero banned phrases. */
export function scoreDraftText(c: GoldenCase, draftText: string): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  for (const phrase of c.requiredPhrases ?? []) {
    if (!normalizeArabic(draftText).includes(normalizeArabic(phrase))) {
      issues.push(`مفقود: «${phrase}»`);
    }
  }
  for (const hit of countBannedPhrases(draftText)) {
    issues.push(`عبارة محظورة: «${hit.phrase}» (×${hit.count})`);
  }
  return { passed: issues.length === 0, issues };
}
