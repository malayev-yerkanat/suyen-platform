import { redirect } from 'next/navigation';

import { signInAction } from '@/app/demo/login/actions';
import { safeDemoPath } from '@/lib/auth';
import { translate } from '@/lib/i18n/catalog';
import { getLocale } from '@/lib/i18n/locale';
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/server';

type LoginSearchParams = Promise<{ next?: string; error?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: LoginSearchParams }) {
  const locale = await getLocale();
  const { next: requestedNext, error } = await searchParams;
  const next = safeDemoPath(requestedNext);
  const configured = isSupabaseConfigured();

  if (configured) {
    const client = await createServerSupabaseClient();
    let signedIn = false;
    try {
      const { data: { user } } = await client!.auth.getUser();
      signedIn = Boolean(user);
    } catch {
      // Keep the sign-in form available when Auth is temporarily unreachable.
    }
    if (signedIn) redirect(next);
  }

  return (
    <main className="demo-content">
      <section className="auth-panel" aria-labelledby="login-title">
        <p className="page-lead">{translate(locale, 'nav.demo')}</p>
        <h1 id="login-title">{translate(locale, 'auth.title')}</h1>
        <p>{translate(locale, 'auth.subtitle')}</p>
        <p>{translate(locale, 'demo.sharedAccount')}</p>
        {!configured && <p role="alert" className="auth-error">{translate(locale, 'auth.configurationError')}</p>}
        {configured && error === 'invalid' && <p role="alert" className="auth-error">{translate(locale, 'auth.invalid')}</p>}
        <form action={signInAction} className="auth-form">
          <input type="hidden" name="next" value={next} />
          <label className="form-field">
            <span>{translate(locale, 'auth.email')}</span>
            <input name="email" type="email" autoComplete="email" required maxLength={254} disabled={!configured} />
          </label>
          <label className="form-field">
            <span>{translate(locale, 'auth.password')}</span>
            <input name="password" type="password" autoComplete="current-password" required disabled={!configured} />
          </label>
          <button className="button button-primary" type="submit" disabled={!configured}>
            {translate(locale, 'auth.submit')}
          </button>
        </form>
        <p>{translate(locale, 'auth.noSignup')}</p>
      </section>
    </main>
  );
}
