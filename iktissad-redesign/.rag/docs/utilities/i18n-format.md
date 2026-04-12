# Utility: i18n Formatting & Bidi

File: `src/lib/i18n/format.ts`

Locale-aware formatting utilities for numbers, currencies, dates, relative time, and bidirectional text isolation. All functions accept a `Locale` ('ar' | 'en') parameter.

---

## Number Formatting

### `formatNumber(value, locale, options?)`
Format a number with locale-appropriate digits. Arabic locale renders Arabic-Indic numerals.

### `formatCompactNumber(value, locale)`
Compact representation (e.g., 1.2K, 3.4M).

### `formatPercent(value, locale, decimals?)`
Format a percentage (value is 0-100).

---

## Currency Formatting

### `formatCurrency(value, locale, currency?, options?)`
Format a currency value. Default currency: `'USD'`.

**Examples:**
- `formatCurrency(1500, 'ar', 'SAR')` -> Arabic-Indic numerals with SAR symbol
- `formatCurrency(1500, 'en', 'USD')` -> `$1,500.00`

---

## Date Formatting

### `formatDate(date, locale, options?)`
Full date with month name. Default: `{ year: 'numeric', month: 'long', day: 'numeric' }`.

### `formatShortDate(date, locale)`
Short numeric date.

### `formatTime(date, locale)`
Time only (HH:MM).

---

## Relative Time

### `formatRelativeTime(date, locale)`
Auto-selects the best unit (seconds, minutes, hours, days, weeks, months, years).

**Examples:**
- `formatRelativeTime(fiveMinAgo, 'ar')` -> "منذ ٥ دقائق"
- `formatRelativeTime(fiveMinAgo, 'en')` -> "5 minutes ago"

---

## Bidirectional Text Utilities

### `isolateLtr(text)` / `isolateRtl(text)` / `isolateAuto(text)`
Wrap text with Unicode bidi isolation marks (LRI/RLI/FSI + PDI). Invisible but corrects rendering of mixed-direction text.

### `addBidiIsolation(html)`
Process article HTML to add `<bdi dir="ltr">` around embedded English words and currency amounts within Arabic text. Applied automatically in article body rendering.

### `BIDI` constants
Unicode marks: `LRI` (\u2066), `RLI` (\u2067), `FSI` (\u2068), `PDI` (\u2069).

---

## React Hook: `useFormatters()`

File: `src/lib/i18n/index.tsx`

Returns locale-bound formatting functions using the current locale from `TranslationProvider`.

```tsx
const { fmtDate, fmtRelative, fmtNumber, fmtCurrency, fmtTime } = useFormatters();
fmtDate(article.publishedAt) // locale-aware
fmtRelative(article.publishedAt) // "منذ ٥ دقائق" or "5 minutes ago"
```

Also provides raw locale strings: `dateLocale` ('ar-SA-u-ca-gregory' or 'en-US') and `numberLocale` ('ar-SA' or 'en-US').

---

## CSS: RTL & Typography (Phase 8)

### globals.css changes
- **Body**: 18px font-size, line-height 1.85, `font-feature-settings: 'liga' 1, 'calt' 1, 'kern' 1`
- **English override**: `html[lang="en"] body { font-size: 1rem; line-height: 1.6 }`
- **Font fallback stack**: `'Tajawal', 'Noto Sans Arabic', 'Noto Naskh Arabic', 'Segoe UI', system-ui, sans-serif`
- **Logical CSS properties**: All physical directional properties (`border-right`, `padding-right`, etc.) converted to logical (`border-inline-start`, `padding-inline-start`, etc.)
- **Bidi isolation**: `bdi` and `[dir="ltr"]` elements get `unicode-bidi: isolate`

### Tailwind logical classes used
- `start-*` / `end-*` (instead of `right-*` / `left-*`)
- `ms-*` / `me-*` (instead of `mr-*` / `ml-*`)
- `ps-*` / `pe-*` (instead of `pr-*` / `pl-*`)
- `border-s-*` / `border-e-*` (instead of `border-r-*` / `border-l-*`)
- `text-start` / `text-end` (instead of `text-right` / `text-left`)
- `inset-x-0` (instead of `left-0 right-0`)
