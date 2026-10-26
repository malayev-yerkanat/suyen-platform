import { MotionScene } from '@/components/MotionScene';
import Link from 'next/link';

import { requireDemoUser } from '@/lib/auth';
import { getSpecialistById } from '@/lib/data/specialists';
import { translate } from '@/lib/i18n/catalog';
import { getLocale } from '@/lib/i18n/locale';
import { formatAlmatyDateTime, formatAlmatyDate, formatAlmatyTime, groupSlotsByAlmatyDate } from '@/lib/time';

type Props = { params: Promise<{ id: string }> };

export default async function SpecialistPage({ params }: Props) {
  const { id } = await params;
  await requireDemoUser(`/demo/specialists/${encodeURIComponent(id)}`);
  const locale = await getLocale();
  let specialist;
  try {
    specialist = await getSpecialistById(id);
  } catch {
    console.error('Specialist detail read failed');
    return (
      <MotionScene><main className="demo-content specialist-detail">
        <h1>{translate(locale, 'specialist.about')}</h1>
        <p role="alert">{translate(locale, 'common.error')}</p>
        <Link className="button" href={`/demo/specialists/${encodeURIComponent(id)}`}>
          {translate(locale, 'common.retry')}
        </Link>
        <Link className="button" href="/demo/specialists">{translate(locale, 'specialist.back')}</Link>
      </main></MotionScene>
    );
  }
  if (!specialist) {
    return (
      <MotionScene><main className="demo-content specialist-detail">
        <h1>{translate(locale, 'specialist.notFound')}</h1>
        <Link className="button" href="/demo/specialists">{translate(locale, 'specialist.back')}</Link>
      </main></MotionScene>
    );
  }
  return (
    <MotionScene><main className="demo-content specialist-detail">
      <Link className="button" href="/demo/specialists">{translate(locale, 'specialist.back')}</Link>
      <header data-motion="item" className="directory-intro">
        <p className="eyebrow">{translate(locale, 'directory.sampleProfile')}</p>
        <h1>{specialist.displayName}</h1>
        <p>{locale === 'kk' ? specialist.roleKk : specialist.role}</p>
        <p>{translate(locale, 'specialist.demoNote')}</p>
      </header>
      <section data-motion="item" className="dashboard-card">
        <h2>{translate(locale, 'specialist.about')}</h2>
        <p>{locale === 'kk' ? specialist.descriptionKk : specialist.description}</p>
        <p>{translate(locale, `support.${specialist.supportArea}`)}</p>
        <p>{translate(locale, 'specialist.languages')}: {specialist.languages.map((language) =>
          translate(locale, language === 'ru' ? 'common.russian' : 'common.kazakh'),
        ).join(' · ')}</p>
      </section>
      <section data-motion="item" className="dashboard-card" id="availability">
        <h2>{translate(locale, 'directory.available')}</h2>
        {specialist.slots.length === 0 ? (
          <>
            <p>{translate(locale, 'directory.noSlots')}</p>
            <Link className="button" href="/demo/specialists">{translate(locale, 'specialist.back')}</Link>
          </>
        ) : (
          <>
            <p className="slot-timezone">{translate(locale, 'specialist.timezone')}</p>
            <div className="slot-days-grid">
            {groupSlotsByAlmatyDate(specialist.slots).map((group) => (
              <section className="slot-day" key={group.date} aria-labelledby={`day-${group.date}`}>
                <h3 id={`day-${group.date}`}>{formatAlmatyDate(group.slots[0].startsAt, locale)}</h3>
                <ul className="slot-list slot-list-compact">
                  {group.slots.map((slot) => (
                    <li key={slot.id}>
                      <Link href={`/demo/bookings/new?slot=${encodeURIComponent(slot.id)}`}
                        aria-label={`${translate(locale, 'directory.bookSlot')}: ${formatAlmatyDateTime(slot.startsAt, locale)}, ${translate(locale, 'specialist.duration')}: ${(Date.parse(slot.endsAt) - Date.parse(slot.startsAt)) / 60_000} ${translate(locale, 'specialist.minutes')}`}>
                        <span>{formatAlmatyTime(slot.startsAt, locale)}</span>
                        <span>{(Date.parse(slot.endsAt) - Date.parse(slot.startsAt)) / 60_000} {translate(locale, 'specialist.minutes')}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            </div>
          </>
        )}
      </section>
    </main></MotionScene>
  );
}
