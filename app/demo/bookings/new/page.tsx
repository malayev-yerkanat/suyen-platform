import Link from 'next/link';

import { BookingReview } from '@/app/demo/bookings/BookingReview';
import { requireDemoUser } from '@/lib/auth';
import { getSlotForReview } from '@/lib/data/bookings';
import { getProfileForUser } from '@/lib/data/profile';
import { translate } from '@/lib/i18n/catalog';
import { getLocale } from '@/lib/i18n/locale';
import { DISPLAY_TIME_ZONE, formatAlmatyDateTime } from '@/lib/time';
import { bookingIdSchema } from '@/lib/validation/booking';

type Props = { searchParams: Promise<{ slot?: string | string[] }> };

export default async function NewBookingPage({ searchParams }: Props) {
  const user = await requireDemoUser('/demo/bookings/new');
  const locale = await getLocale();
  const params = await searchParams;
  const slotId = typeof params.slot === 'string' ? params.slot : '';

  if (!bookingIdSchema.safeParse(slotId).success) {
    return (
      <main className="demo-content booking-page">
        <h1>{translate(locale, 'booking.reviewTitle')}</h1>
        <p role="alert">{translate(locale, 'booking.slotUnavailable')}</p>
        <Link className="button" href="/demo/specialists">{translate(locale, 'booking.backToDirectory')}</Link>
      </main>
    );
  }

  let profile;
  let slot;
  try {
    [profile, slot] = await Promise.all([
      getProfileForUser(user.id), getSlotForReview(slotId),
    ]);
  } catch (error) {
    console.error('Booking review read failed', error);
    return (
      <main className="demo-content booking-page">
        <h1>{translate(locale, 'booking.reviewTitle')}</h1>
        <p role="alert">{translate(locale, 'common.error')}</p>
        <Link className="button" href={`/demo/bookings/new?slot=${encodeURIComponent(slotId)}`}>
          {translate(locale, 'common.retry')}
        </Link>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="demo-content booking-page">
        <h1>{translate(locale, 'booking.reviewTitle')}</h1>
        <p>{translate(locale, 'booking.profileRequired')}</p>
        <Link className="button button-primary" href="/demo/profile">
          {translate(locale, 'dashboard.createProfile')}
        </Link>
      </main>
    );
  }

  if (!slot || !slot.available) {
    return (
      <main className="demo-content booking-page">
        <h1>{translate(locale, 'booking.reviewTitle')}</h1>
        <p role="alert">{translate(locale, 'booking.slotUnavailable')}</p>
        <Link className="button button-primary" href="/demo/specialists">
          {translate(locale, 'booking.new')}
        </Link>
      </main>
    );
  }

  return (
    <main className="demo-content booking-page">
      <header className="booking-intro">
        <p className="eyebrow">{translate(locale, 'nav.demo')}</p>
        <h1>{translate(locale, 'booking.reviewTitle')}</h1>
        <p>{translate(locale, 'booking.reviewSubtitle')}</p>
      </header>
      <section className="surface booking-summary" aria-label={translate(locale, 'booking.reviewTitle')}>
        <dl>
          <div><dt>{translate(locale, 'booking.specialist')}</dt>
            <dd>{slot.specialistName} · {locale === 'kk' ? slot.specialistRoleKk : slot.specialistRole}</dd></div>
          <div><dt>{translate(locale, 'booking.child')}</dt><dd>{profile.nickname}</dd></div>
          <div><dt>{translate(locale, 'booking.dateTime')}</dt>
            <dd>{formatAlmatyDateTime(slot.startsAt, locale)}</dd></div>
          <div><dt>{translate(locale, 'booking.timeZone')}</dt><dd>{DISPLAY_TIME_ZONE}</dd></div>
        </dl>
        <BookingReview profileId={profile.id} slotId={slot.id} locale={locale} />
      </section>
      <Link className="button" href="/demo/specialists">
        {translate(locale, 'booking.backToDirectory')}
      </Link>
    </main>
  );
}
