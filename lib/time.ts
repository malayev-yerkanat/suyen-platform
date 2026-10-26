import { translate, type Locale } from '@/lib/i18n/catalog';

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


export function formatAlmatyDate(instant: string, locale: Locale): string {
  return new Intl.DateTimeFormat(localeCode[locale], {
    timeZone: DISPLAY_TIME_ZONE, day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(instant));
}

export function formatAlmatyTime(instant: string, locale: Locale): string {
  return new Intl.DateTimeFormat(localeCode[locale], {
    timeZone: DISPLAY_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(instant));
}

export function groupSlotsByAlmatyDate<T extends { startsAt: string }>(slots: readonly T[]) {
  const calendar = new Intl.DateTimeFormat('en-CA', {
    timeZone: DISPLAY_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return [...slots].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .reduce<{ date: string; slots: T[] }[]>((groups, slot) => {
      const date = calendar.format(new Date(slot.startsAt));
      const last = groups.at(-1);
      return last?.date === date
        ? [...groups.slice(0, -1), { date, slots: [...last.slots, slot] }]
        : [...groups, { date, slots: [slot] }];
    }, []);
}

/** A complete session label; handles the uncommon case of crossing midnight. */
export function formatBookingSession(startsAt: string, endsAt: string, locale: Locale): string {
  const duration = (Date.parse(endsAt) - Date.parse(startsAt)) / 60_000;
  if (!Number.isFinite(duration) || duration <= 0) throw new RangeError('Invalid booking interval');
  const startDate = formatAlmatyDate(startsAt, locale);
  const endDate = formatAlmatyDate(endsAt, locale);
  const endLabel = startDate === endDate ? '' : `${endDate}, `;
  return `${startDate}, ${formatAlmatyTime(startsAt, locale)}–${endLabel}${formatAlmatyTime(endsAt, locale)} · ${duration} ${translate(locale, 'specialist.minutes')} · ${translate(locale, 'booking.almatyTime')}`;
}
