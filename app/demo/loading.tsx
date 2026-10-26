import { translate } from '@/lib/i18n/catalog';
import { getLocale } from '@/lib/i18n/locale';

export default async function DemoLoading() {
  const locale = await getLocale();
  return (
    <main className="demo-content demo-loading">
      <p role="status">{translate(locale, 'common.loading')}</p>
      <div className="demo-loading__skeleton" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </main>
  );
}
