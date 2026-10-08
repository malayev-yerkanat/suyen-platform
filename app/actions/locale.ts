'use server';

import { cookies } from 'next/headers';

import { isLocale } from '@/lib/i18n/catalog';
import { LOCALE_COOKIE } from '@/lib/i18n/locale';

export async function setLocale(formData: FormData): Promise<void> {
  const locale = formData.get('locale');
  if (!isLocale(locale)) return;

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });
}
