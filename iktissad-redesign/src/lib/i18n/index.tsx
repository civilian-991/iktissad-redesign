/**
 * IKTISSAD i18n System
 *
 * Lightweight internationalization system for the application.
 * Currently supports Arabic (ar) and English (en).
 *
 * Usage:
 * import { t, useTranslation, TranslationProvider } from '@/lib/i18n';
 *
 * // In components:
 * const { t, locale, setLocale } = useTranslation();
 * t('common.actions.subscribe') // Returns translated string
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { ar } from './ar';
import { en } from './en';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type Locale = 'ar' | 'en';
export type Direction = 'rtl' | 'ltr';

export interface TranslationContextValue {
  locale: Locale;
  direction: Direction;
  setLocale: (locale: Locale) => void;
  t: TranslationFunction;
  translations: typeof ar | typeof en;
}

export type TranslationFunction = (
  key: string,
  params?: Record<string, string | number>
) => string;

// ═══════════════════════════════════════════════════════════════
// TRANSLATIONS MAP
// ═══════════════════════════════════════════════════════════════

const translations: Record<Locale, typeof ar | typeof en> = {
  ar,
  en,
};

const directions: Record<Locale, Direction> = {
  ar: 'rtl',
  en: 'ltr',
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current, key) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj as unknown);
}

/**
 * Replace placeholders in a string with values
 * @example interpolate('Hello {name}!', { name: 'World' }) => 'Hello World!'
 */
function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;

  return Object.entries(params).reduce((result, [key, value]) => {
    return result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }, text);
}

/**
 * Create a translation function for a specific locale
 */
function createTranslator(locale: Locale): TranslationFunction {
  const localeTranslations = translations[locale];

  return (key: string, params?: Record<string, string | number>): string => {
    const value = getNestedValue(localeTranslations as unknown as Record<string, unknown>, key);

    if (typeof value === 'string') {
      return interpolate(value, params);
    }

    // Fallback to key if translation not found
    console.warn(`Translation not found for key: ${key}`);
    return key;
  };
}

// ═══════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════

const TranslationContext = createContext<TranslationContextValue | null>(null);

// ═══════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════

interface TranslationProviderProps {
  children: ReactNode;
  defaultLocale?: Locale;
}

export function TranslationProvider({
  children,
  defaultLocale = 'ar',
}: TranslationProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);

    // Update document direction
    if (typeof document !== 'undefined') {
      document.documentElement.dir = directions[newLocale];
      document.documentElement.lang = newLocale;
    }
  }, []);

  const t = useMemo(() => createTranslator(locale), [locale]);

  const value = useMemo<TranslationContextValue>(
    () => ({
      locale,
      direction: directions[locale],
      setLocale,
      t,
      translations: translations[locale],
    }),
    [locale, setLocale, t]
  );

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════

/**
 * Hook to access translation functionality
 */
export function useTranslation(): TranslationContextValue {
  const context = useContext(TranslationContext);

  if (!context) {
    // Return default Arabic translations if not wrapped in provider
    const defaultT = createTranslator('ar');
    return {
      locale: 'ar',
      direction: 'rtl',
      setLocale: () => {},
      t: defaultT,
      translations: ar,
    };
  }

  return context;
}

/**
 * Hook to get the current locale
 */
export function useLocale(): Locale {
  const { locale } = useTranslation();
  return locale;
}

/**
 * Hook to get the current direction
 */
export function useDirection(): Direction {
  const { direction } = useTranslation();
  return direction;
}

// ═══════════════════════════════════════════════════════════════
// STANDALONE TRANSLATOR (for non-component usage)
// ═══════════════════════════════════════════════════════════════

/**
 * Create a standalone translator for a specific locale
 * Useful for server-side rendering or non-React contexts
 */
export function createT(locale: Locale = 'ar'): TranslationFunction {
  return createTranslator(locale);
}

/**
 * Default Arabic translator for quick usage
 */
export const t = createT('ar');

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a locale is supported
 */
export function isValidLocale(locale: string): locale is Locale {
  return locale === 'ar' || locale === 'en';
}

/**
 * Get the direction for a locale
 */
export function getDirection(locale: Locale): Direction {
  return directions[locale];
}

/**
 * Get all supported locales
 */
export function getSupportedLocales(): Locale[] {
  return ['ar', 'en'];
}

/**
 * Get locale display names
 */
export function getLocaleDisplayName(locale: Locale): string {
  const names: Record<Locale, string> = {
    ar: 'العربية',
    en: 'English',
  };
  return names[locale];
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export { ar, en };
export type { TranslationKey } from './ar';

// Re-export locale-aware formatting utilities
export {
  formatNumber,
  formatCompactNumber,
  formatPercent,
  formatCurrency,
  formatDate,
  formatShortDate,
  formatTime,
  formatRelativeTime,
  isolateLtr,
  isolateRtl,
  isolateAuto,
  addBidiIsolation,
  BIDI,
} from './format';

import {
  formatNumber as _fmtNum,
  formatCompactNumber as _fmtCompact,
  formatCurrency as _fmtCurrency,
  formatDate as _fmtDate,
  formatShortDate as _fmtShort,
  formatTime as _fmtTime,
  formatRelativeTime as _fmtRelative,
} from './format';

/**
 * Hook that returns locale-bound formatting functions.
 * Automatically uses the current locale from TranslationProvider.
 *
 * @example
 * const { fmtDate, fmtRelative, fmtNumber } = useFormatters();
 * fmtDate(article.publishedAt) // "١٥ أبريل ٢٠٢٦" or "April 15, 2026"
 * fmtRelative(article.publishedAt) // "منذ ٥ دقائق" or "5 minutes ago"
 */
export function useFormatters() {
  const { locale } = useTranslation();

  return useMemo(() => ({
    fmtNumber: (v: number, opts?: Intl.NumberFormatOptions) => _fmtNum(v, locale, opts),
    fmtCompact: (v: number) => _fmtCompact(v, locale),
    fmtCurrency: (v: number, currency?: string) => _fmtCurrency(v, locale, currency),
    fmtDate: (d: Date | string, opts?: Intl.DateTimeFormatOptions) => _fmtDate(d, locale, opts),
    fmtShortDate: (d: Date | string) => _fmtShort(d, locale),
    fmtTime: (d: Date | string) => _fmtTime(d, locale),
    fmtRelative: (d: Date | string) => _fmtRelative(d, locale),
    /** Locale string for direct Intl use (Western digits via -u-nu-latn). */
    dateLocale: locale === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-US',
    numberLocale: locale === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US',
  }), [locale]);
}
