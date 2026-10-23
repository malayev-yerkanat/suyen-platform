import Link from 'next/link';

import { translate, type Locale } from '@/lib/i18n/catalog';

export function PublicHero({ locale }: { locale: Locale }) {
  return (
    <section className="public-hero page-shell" aria-labelledby="public-title">
      <div className="public-hero__content">
        <span className="eyebrow public-hero__eyebrow"><span className="public-hero__eyebrow-dot" aria-hidden="true" />{translate(locale, 'public.eyebrow')}</span>
        <h1 id="public-title">{translate(locale, 'public.title')}</h1>
        <p className="public-hero__description">{translate(locale, 'public.subtitle')}</p>
        <div className="public-hero__actions">
          <Link className="button button-primary public-hero__cta" href="/demo/login">
            <span>{translate(locale, 'public.demoLabel')}</span>
            <span className="button__icon" aria-hidden="true">↗</span>
          </Link>
          <span className="public-hero__note"><span aria-hidden="true" />{translate(locale, 'public.demoNote')}</span>
        </div>
      </div>
      <div className="public-hero__visual" aria-hidden="true">
        <div className="public-hero__visual-top"><span>SÜYEN</span><span>01 / 03</span></div>
        <div className="public-hero__orbit public-hero__orbit--outer" />
        <div className="public-hero__orbit public-hero__orbit--middle" />
        <div className="public-hero__orbit public-hero__orbit--inner" />
        <div className="public-hero__core"><span>✳</span></div>
        <div className="public-hero__waypoint public-hero__waypoint--one"><span>01</span><i /></div>
        <div className="public-hero__waypoint public-hero__waypoint--two"><span>02</span><i /></div>
        <div className="public-hero__waypoint public-hero__waypoint--three"><span>03</span><i /></div>
        <div className="public-hero__visual-bottom"><span>БІРГЕ · ВМЕСТЕ</span><span>SUYEN / 2026</span></div>
      </div>
    </section>
  );
}
