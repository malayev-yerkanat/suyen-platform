import { Icon } from '@/components/Icon';
import { translate, type Locale } from '@/lib/i18n/catalog';
import { DISPLAY_TIME_ZONE } from '@/lib/time';

const localeCode: Record<Locale, string> = { ru: 'ru-RU', kk: 'kk-KZ' };

function dayLabel(offsetDays: number, locale: Locale): string {
  return new Intl.DateTimeFormat(localeCode[locale], {
    timeZone: DISPLAY_TIME_ZONE, day: 'numeric', month: 'long',
  }).format(new Date(Date.now() + offsetDays * 86_400_000));
}

/**
 * The one moment on the landing page: what the product promises, drawn with the
 * demo's own specialist, times and wording. Decorative, so hidden from assistive
 * technology; the real, interactive version lives at /demo.
 */
export function PublicPreview({ locale }: { locale: Locale }) {
  const tomorrow = dayLabel(1, locale);
  const dayAfter = dayLabel(2, locale);
  const minutes = translate(locale, 'specialist.minutes');

  return (
    <div data-motion="item" className="public-preview" aria-hidden="true">
      <div className="preview-card">
        <div className="preview-person">
          <span className="preview-monogram">АА</span>
          <div>
            <p className="preview-name">Айша Арманова</p>
            <p className="preview-meta">Логопед · {translate(locale, 'support.speech_language')}</p>
          </div>
        </div>
        <p className="preview-label">{translate(locale, 'directory.available')}</p>
        <p className="preview-meta">{translate(locale, 'specialist.timezone')}</p>
        <ul className="preview-slots">
          <li className="time-chip"><span>{tomorrow}</span><span>10:00</span></li>
          <li className="time-chip" data-selected="true"><span>{tomorrow}</span><span>14:00</span></li>
          <li className="time-chip"><span>{dayAfter}</span><span>10:00</span></li>
        </ul>
        <span className="preview-button">{translate(locale, 'booking.confirm')}</span>
      </div>
      <div className="preview-confirmation">
        <span className="preview-check"><Icon name="check" size={18} /></span>
        <div>
          <p className="preview-name">{translate(locale, 'booking.confirmed')}</p>
          <p className="preview-meta">{tomorrow}, 14:00 · 50 {minutes}</p>
        </div>
      </div>
    </div>
  );
}
