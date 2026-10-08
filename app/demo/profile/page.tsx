import Link from 'next/link';

import { ProfileForm } from '@/app/demo/profile/ProfileForm';
import { requireDemoUser } from '@/lib/auth';
import { getProfileForUser } from '@/lib/data/profile';
import { translate } from '@/lib/i18n/catalog';
import { getLocale } from '@/lib/i18n/locale';

export default async function ProfilePage() {
  const user = await requireDemoUser('/demo/profile');
  const locale = await getLocale();
  let profile;

  try {
    profile = await getProfileForUser(user.id);
  } catch (error) {
    console.error('Profile read failed', error);
    return (
      <main className="demo-content profile-page">
        <section className="surface profile-intro" role="alert">
          <h1>{translate(locale, 'profile.title')}</h1>
          <p>{translate(locale, 'profile.error.generic')}</p>
          <Link href="/demo/profile" className="button button-primary">
            {translate(locale, 'common.retry')}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="demo-content profile-page">
      <div className="profile-intro">
        <p className="page-lead">{translate(locale, 'nav.demo')}</p>
        <h1>{translate(locale, 'profile.title')}</h1>
        <p>{translate(locale, 'profile.subtitle')}</p>
      </div>
      <ProfileForm locale={locale} initialProfile={profile} />
    </main>
  );
}
