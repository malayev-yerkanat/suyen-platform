import Link from 'next/link';

import { requireDemoUser } from '@/lib/auth';
import { getNextBookingForUser, type BookingSummary } from '@/lib/data/bookings';
import { getProfileForUser, type ChildProfile } from '@/lib/data/profile';
import { translate } from '@/lib/i18n/catalog';
import { getLocale } from '@/lib/i18n/locale';
import { formatAlmatyDateTime } from '@/lib/time';

export default async function DemoDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ authError?: string }>;
}) {
  const user = await requireDemoUser('/demo');
  const locale = await getLocale();
  const { authError } = await searchParams;
  let profile: ChildProfile | null = null;
  let nextBooking: BookingSummary | null = null;
  let profileReadFailed = false;
  let bookingReadFailed = false;
  try {
    profile = await getProfileForUser(user.id);
  } catch (error) {
    console.error('Dashboard profile read failed', error);
    profileReadFailed = true;
  }
  if (profile) {
    try {
      nextBooking = await getNextBookingForUser(user.id);
    } catch (error) {
      console.error('Dashboard booking read failed', error);
      bookingReadFailed = true;
    }
  }

  return (
    <main className="demo-content">
      <section className="dashboard-intro">
        {authError === 'signout' && <p role="alert" className="auth-error">{translate(locale, 'common.error')}</p>}
        <p className="page-lead">{translate(locale, 'nav.demo')}</p>
        <h1>{translate(locale, 'demo.title')}</h1>
        <p>{translate(locale, 'demo.subtitle')}</p>
        <p>{translate(locale, 'demo.sharedAccount')}</p>
      </section>
      {profileReadFailed ? (
        <section className="dashboard-card" role="alert">
          <p>{translate(locale, 'common.error')}</p>
          <Link href="/demo" className="button button-primary">{translate(locale, 'common.retry')}</Link>
        </section>
      ) : profile ? (
        <section className="dashboard-card" aria-labelledby="profile-title">
          <h2 id="profile-title">{translate(locale, 'dashboard.profile')}</h2>
          <p>{profile.nickname}</p>
          <p>{translate(locale, `profile.age.${profile.ageBand}`)} · {translate(locale, `support.${profile.supportArea}`)}</p>
          <div className="dashboard-actions">
            <Link href="/demo/profile" className="button">{translate(locale, 'dashboard.manageProfile')}</Link>
            <Link href="/demo/specialists" className="button button-primary">{translate(locale, 'dashboard.browse')}</Link>
          </div>
        </section>
      ) : (
        <section className="dashboard-card" aria-labelledby="start-title">
          <h2 id="start-title">{translate(locale, 'dashboard.greeting')}</h2>
          <p>{translate(locale, 'dashboard.emptyProfile')}</p>
          <div className="dashboard-actions">
            <Link href="/demo/profile" className="button button-primary">{translate(locale, 'dashboard.createProfile')}</Link>
            <Link href="/demo/specialists" className="button">{translate(locale, 'dashboard.browse')}</Link>
          </div>
        </section>
      )}
      {profile && !profileReadFailed && (
        <section className="dashboard-card" aria-labelledby="next-booking-title">
          <h2 id="next-booking-title">{translate(locale, 'dashboard.nextBooking')}</h2>
          {bookingReadFailed ? (
            <p role="alert">{translate(locale, 'common.error')}</p>
          ) : nextBooking ? (
            <>
              <p>{nextBooking.specialistName} · {locale === 'kk'
                ? nextBooking.specialistRoleKk : nextBooking.specialistRole}</p>
              <p>{formatAlmatyDateTime(nextBooking.startsAt, locale)}</p>
              <Link href={`/demo/bookings/${nextBooking.id}`} className="button">
                {translate(locale, 'booking.view')}
              </Link>
            </>
          ) : (
            <p>{translate(locale, 'dashboard.noBooking')}</p>
          )}
        </section>
      )}
    </main>
  );
}
