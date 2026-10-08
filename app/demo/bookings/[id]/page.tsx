import Link from 'next/link';

import { CancelBooking } from '@/app/demo/bookings/CancelBooking';
import { requireDemoUser } from '@/lib/auth';
import { canCancelBooking, getBookingForUser } from '@/lib/data/bookings';
import { translate } from '@/lib/i18n/catalog';
import { getLocale } from '@/lib/i18n/locale';
import { DISPLAY_TIME_ZONE, formatAlmatyDateTime } from '@/lib/time';
import { bookingIdSchema } from '@/lib/validation/booking';

type Props = { params: Promise<{ id: string }> };

export default async function BookingDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await requireDemoUser(`/demo/bookings/${id}`);
  const locale = await getLocale();

  let booking = null;
  if (bookingIdSchema.safeParse(id).success) {
    try {
      booking = await getBookingForUser(user.id, id);
    } catch (error) {
      console.error('Booking detail read failed', error);
      return (
        <main className="demo-content booking-page">
          <h1>{translate(locale, 'booking.view')}</h1>
          <p role="alert">{translate(locale, 'common.error')}</p>
          <Link className="button" href={`/demo/bookings/${id}`}>
            {translate(locale, 'common.retry')}
          </Link>
        </main>
      );
    }
  }

  if (!booking) {
    return (
      <main className="demo-content booking-page">
        <h1>{translate(locale, 'booking.view')}</h1>
        <p role="alert">{translate(locale, 'booking.notFound')}</p>
        <Link className="button" href="/demo/specialists">
          {translate(locale, 'booking.backToDirectory')}
        </Link>
      </main>
    );
  }

  const canCancel = canCancelBooking(booking);

  return (
    <main className="demo-content booking-page">
      <header className="booking-intro">
        <p className="eyebrow">{translate(locale, 'nav.demo')}</p>
        <h1>{translate(locale, booking.status === 'confirmed'
          ? 'booking.confirmed' : 'booking.cancelled')}</h1>
      </header>
      <section className="surface booking-summary">
        <dl>
          <div><dt>{translate(locale, 'booking.status')}</dt>
            <dd>{translate(locale, booking.status === 'confirmed'
              ? 'booking.confirmed' : 'booking.cancelled')}</dd></div>
          <div><dt>{translate(locale, 'booking.specialist')}</dt>
            <dd>{booking.specialistName} · {locale === 'kk'
              ? booking.specialistRoleKk : booking.specialistRole}</dd></div>
          <div><dt>{translate(locale, 'booking.child')}</dt><dd>{booking.childNickname}</dd></div>
          <div><dt>{translate(locale, 'booking.dateTime')}</dt>
            <dd>{formatAlmatyDateTime(booking.startsAt, locale)}</dd></div>
          <div><dt>{translate(locale, 'booking.timeZone')}</dt><dd>{DISPLAY_TIME_ZONE}</dd></div>
        </dl>
        {canCancel && <CancelBooking bookingId={booking.id} locale={locale} />}
        {booking.status === 'confirmed' && !canCancel && (
          <p>{translate(locale, 'booking.cancelUnavailable')}</p>
        )}
      </section>
      <Link className="button" href="/demo/specialists">
        {translate(locale, 'booking.backToDirectory')}
      </Link>
    </main>
  );
}
