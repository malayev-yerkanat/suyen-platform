'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { requireDemoUser, safeDemoPath } from '@/lib/auth';
import { getAuth } from '@/lib/auth-server';

const credentialsSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(1024),
});

function loginErrorUrl(next: string, error: 'invalid' | 'configuration'): string {
  return `/demo/login?${new URLSearchParams({ next, error }).toString()}`;
}

export async function signInAction(formData: FormData): Promise<never> {
  const next = safeDemoPath(String(formData.get('next') ?? ''));
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) redirect(loginErrorUrl(next, 'invalid'));

  const auth = getAuth();
  if (!auth) redirect(loginErrorUrl(next, 'configuration'));

  let signInError = false;
  try {
    await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
  } catch {
    signInError = true;
  }
  if (signInError) redirect(loginErrorUrl(next, 'invalid'));

  redirect(next);
}

export async function signOutAction(): Promise<never> {
  await requireDemoUser();
  const auth = getAuth();
  if (!auth) redirect('/demo?authError=signout');
  let signOutError = false;
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch {
    signOutError = true;
  }
  if (signOutError) redirect('/demo?authError=signout');
  redirect('/demo/login');
}
