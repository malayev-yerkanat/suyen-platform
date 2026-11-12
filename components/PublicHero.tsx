import Link from 'next/link';

import { Icon } from '@/components/Icon';
import { PublicPreview } from '@/components/PublicPreview';
import { translate, type Locale } from '@/lib/i18n/catalog';

export function PublicHero({ locale }: { locale: Locale }) {
  return (
    <section className="public-hero page-shell" aria-labelledby="public-title">
      <div data-motion="item" className="public-hero__content">
        <h1 id="public-title">{translate(locale, 'public.title')}</h1>
        <p className="public-hero__description">{translate(locale, 'public.subtitle')}</p>
        <div className="public-hero__actions">
          <Link className="button button-primary public-hero__cta" href="/demo/login">
            <span>{translate(locale, 'public.demoLabel')}</span>
            <Icon name="arrow-up-right" size={18} />
          </Link>
          <span className="public-hero__note">{translate(locale, 'public.demoNote')}</span>
        </div>
      </div>
      <PublicPreview locale={locale} />
    </section>
  );
}
