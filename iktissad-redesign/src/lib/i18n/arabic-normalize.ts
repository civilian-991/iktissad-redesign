/**
 * Arabic text normalization for DEDUPLICATION and ENTITY MATCHING.
 *
 * This is NOT for display — it deliberately destroys information (diacritics,
 * orthographic variants, casing) so that two strings that a reader would treat
 * as "the same" collapse to one canonical form. Use it for:
 *   - deduplicating GCC disclosure titles across sources (Mubasher vs origin
 *     exchange vs Argaam reword the same announcement)
 *   - building the `alias_normalized` column for company/issuer resolution
 *     (gcc_company_aliases) and matching NER-extracted org names against it
 *
 * The rules mirror CAMeL Tools' (NYU Abu Dhabi) normalization primitives
 * (`normalize_alef_ar`, `normalize_teh_marbuta_ar`, `normalize_alef_maksura_ar`,
 * `dediac_ar`) — re-implemented in pure TS so the hot dedup path needs no Python
 * service. See docs/gcc-markets-newsroom-research-appendix.md §13.
 *
 * Digits are FOLDED to Western (0-9), never deleted — financial figures matter,
 * and the site already enforces Western-Arabic numerals everywhere else
 * (see src/lib/i18n/format.ts, `-u-nu-latn`).
 */

// Arabic diacritics (tashkeel): fathatan..sukun (U+064B–U+0652) + superscript
// alef (U+0670). Matches CAMeL's AR_DIAC_CHARSET.
const DIACRITICS = /[ً-ْٰ]/g;

// Alef variants → bare alef (ا U+0627): hamza-above أ, hamza-below إ, madda آ,
// wasla ٱ. Matches CAMeL's _ALEF_NORMALIZE_AR_RE.
const ALEF_VARIANTS = /[أإآٱ]/g;

// Alef maksura ى (U+0649) → yaa ي (U+064A).
const ALEF_MAKSURA = /ى/g;

// Teh marbuta ة (U+0629) → heh ه (U+0647).
const TEH_MARBUTA = /ة/g;

// Tatweel / kashida ـ (U+0640): a pure decorative elongation, always droppable.
const TATWEEL = /ـ/g;

// Arabic-Indic (U+0660–U+0669) and Extended/Persian (U+06F0–U+06F9) digits.
const ARABIC_INDIC_DIGITS = /[٠-٩۰-۹]/g;

function foldDigit(ch: string): string {
  const cp = ch.codePointAt(0)!;
  if (cp >= 0x0660 && cp <= 0x0669) return String(cp - 0x0660); // Arabic-Indic
  if (cp >= 0x06f0 && cp <= 0x06f9) return String(cp - 0x06f0); // Extended (Persian)
  return ch;
}

/**
 * Canonicalize an Arabic string for comparison/deduplication.
 *
 * Pipeline (order matters): NFKC → strip diacritics → fold alef variants →
 * alef-maksura → teh-marbuta → strip tatweel → fold Arabic-Indic digits to
 * Western → collapse whitespace → trim → lowercase (folds any embedded
 * Latin/ticker text too).
 *
 * @example
 *   normalizeArabic('شركة أرامكو  ٢٠٢٤') // => 'شركه ارامكو 2024'
 *   normalizeArabic('شركه ارامكو 2024')  // => 'شركه ارامكو 2024'  (same key)
 */
export function normalizeArabic(input: string): string {
  if (!input) return '';
  return input
    .normalize('NFKC')
    .replace(DIACRITICS, '')
    .replace(ALEF_VARIANTS, 'ا')
    .replace(ALEF_MAKSURA, 'ي')
    .replace(TEH_MARBUTA, 'ه')
    .replace(TATWEEL, '')
    .replace(ARABIC_INDIC_DIGITS, foldDigit)
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Stable dedup key for a disclosure/headline. Prefer the exchange-native id when
 * you have one (see gcc_disclosure_events.dedup_key); fall back to this only when
 * no native id exists. Returns the normalized title; pair it with the issuer to
 * form a composite key, e.g. `${exchange}:${companyId}:${dedupKey(title)}`.
 */
export function dedupKey(title: string): string {
  return normalizeArabic(title);
}

/**
 * Levenshtein distance on already-normalized strings — for near-duplicate
 * detection when exact key match misses (reworded headlines for the same event).
 * Small inputs (titles), so the simple O(n·m) DP is fine.
 */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/**
 * True when two titles are "the same event" — exact normalized match, or a
 * normalized edit distance within `maxDistance` (default 3) for reworded
 * headlines. Normalizes both inputs first.
 */
export function isNearDuplicate(a: string, b: string, maxDistance = 3): boolean {
  const na = normalizeArabic(a);
  const nb = normalizeArabic(b);
  if (na === nb) return true;
  // Don't let tiny strings match on distance alone.
  if (Math.min(na.length, nb.length) < 8) return false;
  return editDistance(na, nb) <= maxDistance;
}
