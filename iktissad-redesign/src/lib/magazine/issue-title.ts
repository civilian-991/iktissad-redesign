/**
 * Builds magazine issue titles in the archive's house style, e.g.
 *   الإقتصاد والأعمال - أيلول - 2026
 *   الإقتصاد والأعمال - تموز / آب - 2026
 *   الإقتصاد والأعمال - تشرين الأول (عدد خاص) - 2025
 *
 * The magazine prints Levantine month names, so the Arabic title always uses
 * them regardless of the admin's UI language.
 */

const MAGAZINE_NAME_AR = 'الإقتصاد والأعمال';

const LEVANTINE_MONTHS = [
  'كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران',
  'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول',
];

const ENGLISH_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface IssueTitleInput {
  issueNumber: string | number;
  year: number;
  /** 0-based month the issue covers. */
  month: number;
  /** 0-based last month for a double issue (e.g. July/August); null for a single month. */
  endMonth: number | null;
  special: boolean;
}

function monthSpan(names: string[], month: number, endMonth: number | null, sep: string) {
  return endMonth === null || endMonth === month
    ? names[month]
    : `${names[month]}${sep}${names[endMonth]}`;
}

export function buildIssueTitle({ year, month, endMonth, special }: IssueTitleInput): string {
  const span = monthSpan(LEVANTINE_MONTHS, month, endMonth, ' / ');
  return special
    ? `${MAGAZINE_NAME_AR} - ${span} (عدد خاص) - ${year}`
    : `${MAGAZINE_NAME_AR} - ${span} - ${year}`;
}

export function buildIssueTitleEn({ issueNumber, year, month, endMonth, special }: IssueTitleInput): string {
  const span = monthSpan(ENGLISH_MONTHS, month, endMonth, ' - ');
  return special
    ? `Special Issue - ${span} ${year}`
    : `Issue ${issueNumber} - ${span} ${year}`;
}

/** First day of the issue's month, used when no publish date is entered. */
export function defaultPublishDate(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-01`;
}
