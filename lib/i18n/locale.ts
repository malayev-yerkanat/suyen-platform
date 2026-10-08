import { cookies } from 'next/headers';

import { resolveLocale, type Locale } from '@/lib/i18n/catalog';

export const LOCALE_COOKIE = 'suyen-locale';

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);
}
