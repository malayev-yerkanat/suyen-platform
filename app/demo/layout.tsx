import Link from 'next/link';

import { signOutAction } from '@/app/demo/login/actions';
import { DemoBanner } from '@/components/DemoBanner';
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
      <DemoBanner locale={locale} />
      <header className="demo-header">
        <Link href="/" className="demo-brand">{translate(locale, 'common.brand')}</Link>
        <nav className="demo-nav" aria-label={translate(locale, 'nav.demo')}>
          {signedIn && <Link href="/demo">{translate(locale, 'nav.dashboard')}</Link>}
          {signedIn && <Link href="/demo/profile">{translate(locale, 'nav.profile')}</Link>}
          {signedIn && <Link href="/demo/specialists">{translate(locale, 'nav.specialists')}</Link>}
          <LocaleSwitch locale={locale} />
          {signedIn && <form action={signOutAction}><button type="submit">{translate(locale, 'nav.signOut')}</button></form>}
        </nav>
      </header>
      {children}
    </div>
  );
}
