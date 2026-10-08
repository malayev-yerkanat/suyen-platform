'use server';

import { revalidatePath } from 'next/cache';

import { requireDemoUser } from '@/lib/auth';
import { saveProfileForUser } from '@/lib/data/profile';
import type { TranslationKey } from '@/lib/i18n/catalog';
import { profileSchema, type ProfileFormValues } from '@/lib/validation/profile';

type ProfileField = keyof ProfileFormValues;

export type ProfileActionState = {
  status: 'idle' | 'success' | 'error';
  values: ProfileFormValues;
  errors: Partial<Record<ProfileField, TranslationKey>>;
  formError?: TranslationKey;
};

const fieldErrors: Record<ProfileField, TranslationKey> = {
  nickname: 'profile.error.nickname',
  ageBand: 'profile.error.ageBand',
  preferredLanguage: 'profile.error.preferredLanguage',
  supportArea: 'profile.error.supportArea',
};

function stringField(formData: FormData, key: ProfileField): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

export async function saveProfileAction(
  _previous: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await requireDemoUser('/demo/profile');
  const values: ProfileFormValues = {
    nickname: stringField(formData, 'nickname'),
    ageBand: stringField(formData, 'ageBand'),
    preferredLanguage: stringField(formData, 'preferredLanguage'),
    supportArea: stringField(formData, 'supportArea'),
  };
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) {
    const errors: ProfileActionState['errors'] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as ProfileField;
      if (field in fieldErrors) errors[field] = fieldErrors[field];
    }
    return { status: 'error', values, errors };
  }

  try {
    await saveProfileForUser(user.id, parsed.data);
    revalidatePath('/demo');
    revalidatePath('/demo/profile');
    return { status: 'success', values: parsed.data, errors: {} };
  } catch (error) {
    console.error('Profile save failed', error);
    return { status: 'error', values, errors: {}, formError: 'profile.error.generic' };
  }
}
