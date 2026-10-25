// The site prints Western digits (0-9) in Arabic too, so force `nu-latn`.
const LOCALE = 'ar-u-nu-latn';

export function formatDate(iso: string | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

export function formatMonthYear(iso: string | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' }).format(d);
}

/** "منذ 3 ساعات" for the last day, then a calendar date. */
export function formatRelative(iso: string | undefined) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 0 || minutes >= 24 * 60) return formatDate(iso);
  try {
    const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto', style: 'short' });
    return minutes < 60 ? rtf.format(-Math.max(1, minutes), 'minute') : rtf.format(-Math.round(minutes / 60), 'hour');
  } catch {
    // Older Hermes builds lack RelativeTimeFormat.
    return formatDate(iso);
  }
}
