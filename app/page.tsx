import { PublicHeader } from '@/components/PublicHeader';
import { PublicHero } from '@/components/PublicHero';
import { PublicProcess } from '@/components/PublicProcess';
import { translate } from '@/lib/i18n/catalog';
import { getLocale } from '@/lib/i18n/locale';

import './public.css';

export default async function HomePage() {
  const locale = await getLocale();

  return (
    <div className="public-page" id="top">
      <PublicHeader locale={locale} />
      <main id="main-content">
        <PublicHero locale={locale} />
        <PublicProcess locale={locale} />
      </main>
      <footer className="public-footer page-shell">
        <a className="public-footer__brand" href="#top" aria-label="Süyen">Süyen<span aria-hidden="true">.</span></a>
        <p>{translate(locale, 'public.disclaimer')}</p>
      </footer>
    </div>
  );
}
