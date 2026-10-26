import Link from 'next/link';
import { demoMetadata } from '@/lib/demo-metadata';

export const generateMetadata = () => demoMetadata('dashboard');

import { signOutAction } from '@/app/demo/login/actions';
import { DemoBanner } from '@/components/DemoBanner';
import { DemoNavigation } from '@/components/DemoNavigation';
import { LocaleSwitch } from '@/components/LocaleSwitch';
import { translate } from '@/lib/i18n/catalog';
import { getLocale } from '@/lib/i18n/locale';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function DemoLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const client = await createServerSupabaseClient();
  let signedIn = false;
  if (client) {
    try {
      const { data: { user } } = await client.auth.getUser();
      signedIn = Boolean(user);
    } catch {
      // The protected page still performs its own Auth check.
    }
  }

  return (
    <div className="demo-shell">
      <a className="skip-link" href="#demo-main">{translate(locale, 'nav.skipToContent')}</a>
      <DemoBanner locale={locale} />
      <header className="demo-header">
        <Link href="/" className="demo-brand">{translate(locale, 'common.brand')}</Link>
        {signedIn ? (
          <DemoNavigation
            locale={locale}
            localeSwitch={<LocaleSwitch locale={locale} />}
            signOut={<form action={signOutAction}><button type="submit" className="button demo-nav__signout">{translate(locale, 'nav.signOut')}</button></form>}
          />
        ) : <LocaleSwitch locale={locale} />}
      </header>
      <div id="demo-main" tabIndex={-1}>{children}</div>
    </div>
  );
}
