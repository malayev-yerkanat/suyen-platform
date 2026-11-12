import Link from 'next/link';

import { BrandMark } from '@/components/BrandMark';
import { LocaleSwitch } from '@/components/LocaleSwitch';
import { translate, type Locale } from '@/lib/i18n/catalog';

export function PublicHeader({ locale }: { locale: Locale }) {
  return (
    <header className="public-header page-shell">
      <a className="public-header__brand" href="/" aria-label="Süyen">
        <BrandMark />
        <span>Süyen</span>
      </a>
      <nav className="public-header__nav" aria-label={translate(locale, 'nav.home')}>
        <a href="#how-it-works">{translate(locale, 'public.processEyebrow')}</a>
        <Link href="/demo/login">{translate(locale, 'nav.demo')}</Link>
      </nav>
      <LocaleSwitch locale={locale} />
    </header>
  );
}
