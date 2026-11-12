import Link from 'next/link';

import { BrandMark } from '@/components/BrandMark';
import { translate } from '@/lib/i18n/catalog';
import { getLocale } from '@/lib/i18n/locale';

/** Unknown addresses get a way back instead of the framework default. */
export default async function NotFound() {
  const locale = await getLocale();
  return (
    <main className="not-found page-shell">
      <Link href="/" className="not-found__brand" aria-label="Süyen">
        <BrandMark />
        <span>Süyen</span>
      </Link>
      <p className="not-found__code">404</p>
      <h1>{translate(locale, 'notFound.title')}</h1>
      <p>{translate(locale, 'notFound.body')}</p>
      <div className="dashboard-actions">
        <Link href="/" className="button button-primary">{translate(locale, 'nav.home')}</Link>
        <Link href="/demo" className="button">{translate(locale, 'nav.demo')}</Link>
      </div>
    </main>
  );
}
