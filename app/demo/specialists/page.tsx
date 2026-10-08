import Link from 'next/link';

import { DirectoryFilters } from '@/app/demo/specialists/DirectoryFilters';
import { getSpecialistDirectory } from '@/lib/data/specialists';
import { directoryEmptyState, filterSpecialists, parseDirectoryFilters } from '@/lib/filters';
import { requireDemoUser } from '@/lib/auth';
import { translate } from '@/lib/i18n/catalog';
import { getLocale } from '@/lib/i18n/locale';
import { formatAlmatyDateTime } from '@/lib/time';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SpecialistsPage({ searchParams }: Props) {
  await requireDemoUser('/demo/specialists');
  const locale = await getLocale();
  const filters = parseDirectoryFilters(await searchParams);
  let directory;
  try {
    directory = await getSpecialistDirectory();
  } catch {
    return (
      <main className="demo-content">
        <h1>{translate(locale, 'directory.title')}</h1>
        <p role="alert">{translate(locale, 'common.error')}</p>
        <Link className="button" href="/demo/specialists">{translate(locale, 'common.retry')}</Link>
      </main>
    );
  }

  const matches = filterSpecialists(directory, filters);
  const emptyState = directoryEmptyState(directory, filters);

  return (
    <main className="demo-content">
      <header className="directory-intro">
        <p className="eyebrow">{translate(locale, 'nav.demo')}</p>
        <h1>{translate(locale, 'directory.title')}</h1>
        <p>{translate(locale, 'directory.subtitle')}</p>
      </header>
      <DirectoryFilters locale={locale} filters={filters} />
      {emptyState && (
        <section className="directory-empty" aria-live="polite">
          <h2>{translate(locale, emptyState === 'no-slots' ? 'directory.noSlots' : 'directory.noMatches')}</h2>
          <Link href="/demo/specialists" className="button button-primary">
            {translate(locale, emptyState === 'no-slots'
              ? 'directory.noSlotsAction' : 'directory.noMatchesAction')}
          </Link>
        </section>
      )}
      {matches.length > 0 && (
        <div className="specialist-grid">
          {matches.map((specialist) => (
            <article className="specialist-card" key={specialist.id}>
              <p className="eyebrow">{translate(locale, 'directory.sampleProfile')}</p>
              <h2>{specialist.displayName}</h2>
              <p>{locale === 'kk' ? specialist.roleKk : specialist.role}</p>
              <p>{translate(locale, `support.${specialist.supportArea}`)}</p>
              <p>{specialist.languages.map((language) =>
                translate(locale, language === 'ru' ? 'common.russian' : 'common.kazakh'),
              ).join(' · ')}</p>
              <p>{locale === 'kk' ? specialist.descriptionKk : specialist.description}</p>
              <h3>{translate(locale, 'directory.available')}</h3>
              {specialist.slots.length === 0 ? (
                <p>{translate(locale, 'directory.noSlots')}</p>
              ) : (
                <ul className="slot-list">
                  {specialist.slots.map((slot) => (
                    <li key={slot.id}>
                      <Link href={`/demo/bookings/new?slot=${encodeURIComponent(slot.id)}`}>
                        <span>{formatAlmatyDateTime(slot.startsAt, locale)}</span>
                        <span>{translate(locale, 'directory.bookSlot')}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
