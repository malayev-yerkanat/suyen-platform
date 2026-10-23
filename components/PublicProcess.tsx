import { translate, type Locale } from '@/lib/i18n/catalog';

const steps = [1, 2, 3] as const;

export function PublicProcess({ locale }: { locale: Locale }) {
  return (
    <section className="public-process page-shell" id="how-it-works" aria-labelledby="public-process-title">
      <div className="public-process__intro">
        <span className="eyebrow">{translate(locale, 'public.processEyebrow')}</span>
        <h2 id="public-process-title">{translate(locale, 'public.processTitle')}</h2>
        <span className="public-process__rule" aria-hidden="true" />
      </div>
      <ol className="public-process__steps">
        {steps.map((step) => (
          <li className="public-process__step" key={step}>
            <span className="public-process__number" aria-hidden="true">0{step}</span>
            <div>
              <h3>{translate(locale, `public.step${step}Title`)}</h3>
              <p>{translate(locale, `public.step${step}Body`)}</p>
            </div>
            <span className="public-process__arrow" aria-hidden="true">↗</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
