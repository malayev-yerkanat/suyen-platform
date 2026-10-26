import { MotionScene } from '@/components/MotionScene';
import Link from 'next/link';

import { requireDemoUser } from '@/lib/auth';
import { bookingViews, filterBookingHistory, parseBookingView } from '@/lib/booking-history';
import { getBookingsForUser, type BookingSummary } from '@/lib/data/bookings';
import { translate } from '@/lib/i18n/catalog';
import { getLocale } from '@/lib/i18n/locale';
import { formatBookingSession } from '@/lib/time';

export default async function BookingsPage({ searchParams }: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const user = await requireDemoUser('/demo/bookings');
  const locale = await getLocale();
  const view = parseBookingView((await searchParams).view);
  let bookings: BookingSummary[] = [];
  let failed = false;
  try {
    bookings = await getBookingsForUser(user.id);
  } catch {
    console.error('Appointment history read failed');
    failed = true;
  }
  const visibleBookings = filterBookingHistory(bookings, view);

  return (
    <MotionScene><main className="demo-content appointments-page">
      <header data-motion="item" className="directory-intro">
        <p className="eyebrow">{translate(locale, 'nav.demo')}</p>
        <h1>{translate(locale, 'appointments.title')}</h1>
        <p>{translate(locale, 'appointments.subtitle')}</p>
      </header>
      <nav className="dashboard-actions appointment-tabs" aria-label={translate(locale, 'appointments.filters')}>
        {bookingViews.map((item) => (
          <Link key={item} href={`/demo/bookings?view=${item}`}
            className={`button${view === item ? ' button-primary' : ''}`}
            aria-current={view === item ? 'page' : undefined}>
            {translate(locale, `appointments.${item}`)}
          </Link>
        ))}
      </nav>
      {view === 'past' && <p className="appointments-note">{translate(locale, 'appointments.pastNote')}</p>}
      {failed ? (
        <section data-motion="item" className="dashboard-card" role="alert">
          <p>{translate(locale, 'common.error')}</p>
          <Link href={`/demo/bookings?view=${view}`} className="button">{translate(locale, 'common.retry')}</Link>
        </section>
      ) : visibleBookings.length === 0 ? (
        <section data-motion="item" className="dashboard-card">
          <h2>{translate(locale, `appointments.empty.${view}`)}</h2>
          <Link href="/demo/specialists" className="button button-primary">{translate(locale, 'appointments.browse')}</Link>
        </section>
      ) : (
        <div className="appointments-list">
          {visibleBookings.map((booking) => (
            <article key={booking.id} data-motion="item" className="dashboard-card appointment-card">
              <h2>{booking.specialistName}</h2>
              <p>{locale === 'kk' ? booking.specialistRoleKk : booking.specialistRole}</p>
              <p><time dateTime={booking.startsAt}>{formatBookingSession(booking.startsAt, booking.endsAt, locale)}</time></p>
              <p>{translate(locale, 'appointments.child')}: {booking.childNickname}</p>
              <p className="appointment-status" data-status={booking.status}>{translate(locale, booking.status === 'cancelled'
                ? 'appointments.cancelledStatus' : 'appointments.confirmed')}</p>
              <div className="dashboard-actions">
                <Link href={`/demo/bookings/${booking.id}`} className="button button-primary">{translate(locale, 'booking.view')}</Link>
                <Link href={`/demo/specialists/${encodeURIComponent(booking.specialistId)}`} className="button">{translate(locale, 'appointments.rebook')}</Link>
              </div>
              {view === 'upcoming' && <p className="appointments-note">{translate(locale, 'appointments.rebookNote')}</p>}
            </article>
          ))}
        </div>
      )}
    </main></MotionScene>
  );
}
