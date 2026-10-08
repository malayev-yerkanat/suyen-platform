import { translate, type Locale } from '@/lib/i18n/catalog';

export function DemoBanner({ locale }: { locale: Locale }) {
  return (
    <aside className="demo-banner" aria-label={translate(locale, 'demo.bannerShort')}>
      <span className="demo-banner__mark" aria-hidden="true" />
      <span>{translate(locale, 'demo.banner')}</span>
    </aside>
  );
}
