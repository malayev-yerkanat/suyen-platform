import { redirect } from 'next/navigation';

import { signInAction } from '@/app/demo/login/actions';
import { SubmitButton } from '@/app/demo/login/SubmitButton';
import { getDemoUser, safeDemoPath } from '@/lib/auth';
import { isDatabaseConfigured } from '@/lib/db';
import { translate } from '@/lib/i18n/catalog';
import { getLocale } from '@/lib/i18n/locale';

type LoginSearchParams = Promise<{ next?: string; error?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: LoginSearchParams }) {
  const locale = await getLocale();
  const { next: requestedNext, error } = await searchParams;
  const next = safeDemoPath(requestedNext);
  const configured = isDatabaseConfigured();

  // getDemoUser never throws, so the form stays available if Auth is unreachable.
  if (configured && await getDemoUser()) redirect(next);

  return (
    <main className="demo-content">
      <section className="auth-panel" aria-labelledby="login-title">
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
          <SubmitButton
            label={translate(locale, 'auth.submit')}
            pendingLabel={translate(locale, 'auth.submitting')}
            disabled={!configured}
          />
        </form>
        <p>{translate(locale, 'auth.noSignup')}</p>
      </section>
    </main>
  );
}
