import { describe, it, expect } from 'vitest';
import { verifyDraft } from './verifier';
import type { VerifiedFigure } from '@/lib/gcc/sourcing/types';

const figures: VerifiedFigure[] = [
  {
    label: 'صافي الربح', labelNormalized: 'net_profit', value: 4.2, scale: 'billions',
    unit: 'SAR', period: 'FY2025', sourceSpan: 'صافي الربح 4.2 مليار ريال', extractionMethod: 'rule',
  },
];

describe('verifyDraft — deterministic number checking (no network)', () => {
  it('marks a matching figure as supported and publishable', async () => {
    const r = await verifyDraft({
      claims: [{ text: 'بلغ صافي الربح 4.2 مليار ريال', type: 'number' }],
      figures, disclosureText: 'صافي الربح 4.2 مليار ريال', sourceTier: 'origin',
    });
    expect(r.verdicts[0].status).toBe('supported');
    expect(r.publishable).toBe(true);
    expect(r.verdicts[0].confidenceScore).toBeGreaterThan(0.9); // origin tier
  });

  it('matches a scaled figure (4.2 billions == 4200000000)', async () => {
    const r = await verifyDraft({
      claims: [{ text: 'بلغ صافي الربح 4200000000 ريال', type: 'number' }],
      figures, disclosureText: '...', sourceTier: 'origin',
    });
    expect(r.verdicts[0].status).toBe('supported');
  });

  it('BLOCKS a wrong number as contradicted', async () => {
    const r = await verifyDraft({
      claims: [{ text: 'بلغ صافي الربح 4.5 مليار ريال', type: 'number' }],
      figures, disclosureText: '...', sourceTier: 'origin',
    });
    expect(r.verdicts[0].status).toBe('contradicted');
    expect(r.publishable).toBe(false);
    expect(r.blockers.length).toBeGreaterThan(0);
  });

  it('BLOCKS a fabricated number that is in neither figures nor the source', async () => {
    const r = await verifyDraft({
      claims: [{ text: 'ارتفعت الإيرادات بنسبة 12 بالمئة', type: 'number' }],
      figures: [], disclosureText: 'نص لا يذكر النسبة', sourceTier: 'origin',
    });
    expect(r.verdicts[0].status).toBe('contradicted');
    expect(r.publishable).toBe(false);
  });

  it('ACCEPTS a number that appears in the source text even if not an extracted figure', async () => {
    const r = await verifyDraft({
      claims: [{ text: 'بلغت الغرامة 10,000 ريال', type: 'number' }],
      figures: [], disclosureText: 'فرضت الهيئة غرامة قدرها 10,000 ريال على الشركة', sourceTier: 'origin',
    });
    expect(r.verdicts[0].status).toBe('supported');
    expect(r.publishable).toBe(true);
  });

  it('grounds a name claim present in the disclosure text', async () => {
    const r = await verifyDraft({
      claims: [{ text: 'عيّنت الشركة المهندس أحمد الزهراني رئيساً تنفيذياً', type: 'name' }],
      figures: [], disclosureText: 'عيّنت الشركة المهندس أحمد الزهراني رئيساً تنفيذياً للشركة', sourceTier: 'origin',
    });
    expect(r.verdicts[0].status).toBe('supported');
    expect(r.publishable).toBe(true); // name claims don't hard-block
  });
});
