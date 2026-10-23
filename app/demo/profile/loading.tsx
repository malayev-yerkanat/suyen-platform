import { translate } from '@/lib/i18n/catalog';
import { getLocale } from '@/lib/i18n/locale';

export default async function ProfileLoading() {
  const locale = await getLocale();
  return (
    <main className="demo-content profile-page" role="status" aria-live="polite">
      <p>{translate(locale, 'common.loading')}</p>
    </main>
  );
}
