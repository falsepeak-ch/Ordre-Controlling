import i18n from '~/i18n';

// Map an app locale (ca/es/en) to the BCP 47 tag used by Intl. Unknown
// codes pass through — Intl tolerates anything, just falls back.
function bcp47(locale: string): string {
  switch (locale) {
    case 'ca':
      return 'ca-ES';
    case 'es':
      return 'es-ES';
    case 'en':
      return 'en-GB';
    default:
      return locale;
  }
}

function currentLocale(): string {
  return bcp47(i18n.resolvedLanguage ?? i18n.language ?? 'ca');
}

// EUR stays hardcoded here — Phase 6 unblocks `Project.currency`.
export function eur(n: number): string {
  return new Intl.NumberFormat(currentLocale(), {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

export function eurFull(n: number): string {
  return new Intl.NumberFormat(currentLocale(), {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function relDate(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return i18n.t('time.justNow');
  if (diff < 3600) return i18n.t('time.minutesAgo', { n: Math.floor(diff / 60) });
  if (diff < 86400) return i18n.t('time.hoursAgo', { n: Math.floor(diff / 3600) });
  const days = Math.floor(diff / 86400);
  if (days < 7) return i18n.t('time.daysAgo', { n: days });
  if (days < 30) return i18n.t('time.weeksAgo', { n: Math.floor(days / 7) });
  return d.toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(currentLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const locale = currentLocale();
  const date = d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

export const initialsFromName = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
