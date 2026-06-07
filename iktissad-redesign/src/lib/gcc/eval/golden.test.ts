import { describe, it, expect } from 'vitest';
import { GOLDEN_CASES, countBannedPhrases } from './golden';
import { scoreExtraction, scoreDraftText } from './scorer';

describe('regression harness — deterministic extractor coverage', () => {
  for (const c of GOLDEN_CASES) {
    it(`extracts every required figure for ${c.id}`, () => {
      const score = scoreExtraction(c);
      expect(score.missing, `missing: ${JSON.stringify(score.missing)}`).toHaveLength(0);
      expect(score.figureCoverage).toBe(1);
      expect(score.passed).toBe(true);
    });
  }
});

describe('banned-phrase guard', () => {
  it('flags absolutist phrasing', () => {
    const hits = countBannedPhrases('هذه فرصة العمر وأرباح مؤكدة بلا مخاطر');
    expect(hits.length).toBeGreaterThanOrEqual(2);
  });
  it('passes a clean neutral draft', () => {
    const c = GOLDEN_CASES[0];
    const clean = 'أعلنت الشركة نتائجها للعام 2025 حيث بلغ صافي الربح 4.2 مليار ريال.';
    expect(scoreDraftText(c, clean).passed).toBe(true);
  });
  it('fails a draft with a banned phrase', () => {
    const c = GOLDEN_CASES[0];
    const bad = 'صافي الربح 4.2 مليار ريال — توصية شراء مؤكدة';
    expect(scoreDraftText(c, bad).passed).toBe(false);
  });
});

describe('required-phrase check (faithfulness)', () => {
  it('passes when the named person is present', () => {
    const c = GOLDEN_CASES.find((g) => g.id === 'board-001')!;
    expect(scoreDraftText(c, 'عيّنت الشركة خالد العتيبي رئيساً تنفيذياً').passed).toBe(true);
  });
  it('fails when a required name is missing', () => {
    const c = GOLDEN_CASES.find((g) => g.id === 'board-001')!;
    expect(scoreDraftText(c, 'عيّنت الشركة رئيساً تنفيذياً جديداً').passed).toBe(false);
  });
});
