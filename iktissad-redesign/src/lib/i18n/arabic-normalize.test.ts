import { describe, it, expect } from 'vitest';
import { normalizeArabic, isNearDuplicate, editDistance } from './arabic-normalize';

describe('normalizeArabic', () => {
  it('folds alef variants, teh marbuta, and diacritics to one canonical form', () => {
    // "شركة أرامكو" (with hamza + teh marbuta) vs "شركه ارامكو" (bare) → same key
    expect(normalizeArabic('شركة أرامكو')).toBe(normalizeArabic('شركه ارامكو'));
  });

  it('folds Arabic-Indic digits to Western (does not delete them)', () => {
    expect(normalizeArabic('٢٠٢٤')).toBe('2024');
    expect(normalizeArabic('نتائج ٢٠٢٥')).toContain('2025');
  });

  it('strips tatweel and collapses whitespace', () => {
    expect(normalizeArabic('شــركة   الاتصالات')).toBe(normalizeArabic('شركه الاتصالات'));
  });

  it('strips diacritics (tashkeel)', () => {
    expect(normalizeArabic('الرِّبْح')).toBe(normalizeArabic('الربح'));
  });

  it('lowercases embedded latin (tickers)', () => {
    expect(normalizeArabic('TASI Index')).toBe('tasi index');
  });

  it('returns empty for empty input', () => {
    expect(normalizeArabic('')).toBe('');
  });
});

describe('editDistance', () => {
  it('is zero for identical strings', () => {
    expect(editDistance('aramco', 'aramco')).toBe(0);
  });
  it('counts single edits', () => {
    expect(editDistance('aramco', 'aramko')).toBe(1);
  });
});

describe('isNearDuplicate', () => {
  it('matches the same event reworded after normalization', () => {
    expect(isNearDuplicate('أعلنت أرامكو عن نتائجها', 'اعلنت ارامكو عن نتائجها')).toBe(true);
  });
  it('does not match short unrelated strings on distance alone', () => {
    expect(isNearDuplicate('نفط', 'ذهب')).toBe(false);
  });
});
