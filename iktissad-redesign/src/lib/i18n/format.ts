/**
 * Locale-aware formatting utilities for numbers, currencies, dates,
 * and bidirectional text isolation.
 *
 * Arabic locale uses Arabic-Indic numerals and proper month names.
 * English locale uses Western numerals and standard formatting.
 */

import type { Locale } from './index';

// ═══════════════════════════════════════════════════════════════
// NUMBER FORMATTING
// ═══════════════════════════════════════════════════════════════

const numberFormatters = new Map<string, Intl.NumberFormat>();

function getNumberFormatter(locale: Locale, options?: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}-${JSON.stringify(options ?? {})}`;
  let fmt = numberFormatters.get(key);
  if (!fmt) {
    // ar-SA uses Arabic-Indic numerals; ar-EG uses Western numerals
    // We use ar-SA for authentic Arabic numeral display
    const intlLocale = locale === 'ar' ? 'ar-SA' : 'en-US';
    fmt = new Intl.NumberFormat(intlLocale, options);
    numberFormatters.set(key, fmt);
  }
  return fmt;
}

/**
 * Format a number with locale-appropriate digits.
 * Arabic locale renders Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩).
 */
export function formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions): string {
  return getNumberFormatter(locale, options).format(value);
}

/**
 * Format a number as a compact representation (e.g., 1.2K, 3.4M).
 */
export function formatCompactNumber(value: number, locale: Locale): string {
  return getNumberFormatter(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

/**
 * Format a percentage.
 */
export function formatPercent(value: number, locale: Locale, decimals = 1): string {
  return getNumberFormatter(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

// ═══════════════════════════════════════════════════════════════
// CURRENCY FORMATTING
// ═══════════════════════════════════════════════════════════════

/**
 * Format a currency value with locale conventions.
 * @example formatCurrency(1500, 'ar', 'SAR') → "١٬٥٠٠٫٠٠ ر.س"
 * @example formatCurrency(1500, 'en', 'USD') → "$1,500.00"
 */
export function formatCurrency(
  value: number,
  locale: Locale,
  currency: string = 'USD',
  options?: Partial<Intl.NumberFormatOptions>,
): string {
  return getNumberFormatter(locale, {
    style: 'currency',
    currency,
    ...options,
  }).format(value);
}

// ═══════════════════════════════════════════════════════════════
// DATE FORMATTING
// ═══════════════════════════════════════════════════════════════

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function getDateFormatter(locale: Locale, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}-${JSON.stringify(options)}`;
  let fmt = dateFormatters.get(key);
  if (!fmt) {
    const intlLocale = locale === 'ar' ? 'ar-SA' : 'en-US';
    fmt = new Intl.DateTimeFormat(intlLocale, options);
    dateFormatters.set(key, fmt);
  }
  return fmt;
}

/**
 * Format a date with full month name.
 * @example formatDate(date, 'ar') → "١٥ أبريل ٢٠٢٦"
 */
export function formatDate(
  date: Date | string,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return getDateFormatter(locale, options ?? {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

/**
 * Format a short date.
 * @example formatShortDate(date, 'ar') → "١٥/٤/٢٠٢٦"
 */
export function formatShortDate(date: Date | string, locale: Locale): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return getDateFormatter(locale, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(d);
}

/**
 * Format a time.
 */
export function formatTime(date: Date | string, locale: Locale): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return getDateFormatter(locale, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

// ═══════════════════════════════════════════════════════════════
// RELATIVE TIME
// ═══════════════════════════════════════════════════════════════

const relativeFormatters = new Map<string, Intl.RelativeTimeFormat>();

function getRelativeFormatter(locale: Locale): Intl.RelativeTimeFormat {
  let fmt = relativeFormatters.get(locale);
  if (!fmt) {
    const intlLocale = locale === 'ar' ? 'ar' : 'en';
    fmt = new Intl.RelativeTimeFormat(intlLocale, { numeric: 'auto' });
    relativeFormatters.set(locale, fmt);
  }
  return fmt;
}

/**
 * Format a relative time string.
 * @example formatRelativeTime(date, 'ar') → "منذ ٥ دقائق"
 * @example formatRelativeTime(date, 'en') → "5 minutes ago"
 */
export function formatRelativeTime(date: Date | string, locale: Locale): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = Date.now();
  const diffMs = d.getTime() - now;
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHr = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHr / 24);
  const diffWeek = Math.round(diffDay / 7);
  const diffMonth = Math.round(diffDay / 30);
  const diffYear = Math.round(diffDay / 365);

  const fmt = getRelativeFormatter(locale);

  if (Math.abs(diffSec) < 60) return fmt.format(diffSec, 'second');
  if (Math.abs(diffMin) < 60) return fmt.format(diffMin, 'minute');
  if (Math.abs(diffHr) < 24) return fmt.format(diffHr, 'hour');
  if (Math.abs(diffDay) < 7) return fmt.format(diffDay, 'day');
  if (Math.abs(diffWeek) < 5) return fmt.format(diffWeek, 'week');
  if (Math.abs(diffMonth) < 12) return fmt.format(diffMonth, 'month');
  return fmt.format(diffYear, 'year');
}

// ═══════════════════════════════════════════════════════════════
// BIDIRECTIONAL TEXT UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Unicode bidi isolation marks.
 * Use these to wrap embedded text segments that differ in directionality.
 */
export const BIDI = {
  /** Left-to-Right Isolate — wraps LTR text (e.g., English terms in Arabic) */
  LRI: '\u2066',
  /** Right-to-Left Isolate — wraps RTL text (e.g., Arabic in English) */
  RLI: '\u2067',
  /** First Strong Isolate — auto-detects direction of embedded text */
  FSI: '\u2068',
  /** Pop Directional Isolate — closes any *RI mark */
  PDI: '\u2069',
} as const;

/**
 * Wrap an LTR segment (English term, brand name, number) within Arabic text.
 * Uses Unicode bidi isolation — invisible but corrects rendering.
 *
 * @example isolateLtr("S&P 500") → "\u2066S&P 500\u2069"
 */
export function isolateLtr(text: string): string {
  return `${BIDI.LRI}${text}${BIDI.PDI}`;
}

/**
 * Wrap an RTL segment (Arabic term) within English text.
 */
export function isolateRtl(text: string): string {
  return `${BIDI.RLI}${text}${BIDI.PDI}`;
}

/**
 * Auto-isolate a text segment — the browser detects its base direction.
 */
export function isolateAuto(text: string): string {
  return `${BIDI.FSI}${text}${BIDI.PDI}`;
}

/**
 * Process article HTML to add bidi isolation around common LTR terms
 * embedded in Arabic text (company names, financial terms, etc.).
 *
 * Wraps:
 * - English words/phrases (Latin characters)
 * - Numbers with currency symbols ($, €, £)
 * - Known financial terms (GDP, IPO, ETF, etc.)
 */
export function addBidiIsolation(html: string): string {
  // Wrap sequences of Latin chars/digits that appear within Arabic context.
  // Uses <bdi> elements for HTML context (more reliable than Unicode marks in DOM).
  return html
    // Wrap standalone English words/phrases (3+ Latin chars, possibly with spaces)
    .replace(
      /(?<=[\u0600-\u06FF\s>])([A-Za-z][A-Za-z0-9\s.&'-]{2,}[A-Za-z0-9])(?=[\u0600-\u06FF\s<,.])/g,
      '<bdi dir="ltr">$1</bdi>'
    )
    // Wrap currency amounts ($1,234.56, €500, etc.)
    .replace(
      /(?<=[\u0600-\u06FF\s>])([$€£¥]\s?\d[\d,.']*\d?)(?=[\u0600-\u06FF\s<,.])/g,
      '<bdi dir="ltr">$1</bdi>'
    );
}
