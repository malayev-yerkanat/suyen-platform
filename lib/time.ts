import type { Locale } from '@/lib/i18n/catalog';

export const DISPLAY_TIME_ZONE = 'Asia/Almaty' as const;

const localeCode: Record<Locale, string> = { ru: 'ru-RU', kk: 'kk-KZ' };

/** The time-zone database supplies the offset for the given instant. */
export function formatAlmatyDateTime(instant: string | Date, locale: Locale): string {
  const date = instant instanceof Date ? instant : new Date(instant);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError('Invalid booking instant');
  }

  const formatted = new Intl.DateTimeFormat(localeCode[locale], {
    timeZone: DISPLAY_TIME_ZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'shortOffset',
  }).format(date);

  return `${formatted} (${DISPLAY_TIME_ZONE})`;
}
