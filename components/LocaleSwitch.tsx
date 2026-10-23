import { setLocale } from '@/app/actions/locale';
import { translate, type Locale } from '@/lib/i18n/catalog';

export function LocaleSwitch({ locale }: { locale: Locale }) {
  return (
    <form action={setLocale} aria-label={translate(locale, 'common.language')} className="locale-switch">
      <span className="locale-switch__label">{translate(locale, 'common.language')}</span>
      <button
        type="submit"
        name="locale"
        value="ru"
        lang="ru"
        aria-pressed={locale === 'ru'}
        className="locale-switch__option"
      >
        RU
      </button>
      <button
        type="submit"
        name="locale"
        value="kk"
        lang="kk"
        aria-pressed={locale === 'kk'}
        className="locale-switch__option"
      >
        ҚАЗ
      </button>
    </form>
  );
}
