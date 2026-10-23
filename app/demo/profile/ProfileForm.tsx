'use client';

import { useActionState, useState } from 'react';

import { saveProfileAction, type ProfileActionState } from '@/app/demo/profile/actions';
import type { ChildProfile } from '@/lib/data/profile';
import { translate, type Locale } from '@/lib/i18n/catalog';
import {
  ageBands,
  preferredLanguages,
  supportAreas,
  type ProfileFormValues,
} from '@/lib/validation/profile';

type Props = { locale: Locale; initialProfile: ChildProfile | null };

export function ProfileForm({ locale, initialProfile }: Props) {
  const initialValues: ProfileFormValues = {
    nickname: initialProfile?.nickname ?? '',
    ageBand: initialProfile?.ageBand ?? '',
    preferredLanguage: initialProfile?.preferredLanguage ?? '',
    supportArea: initialProfile?.supportArea ?? '',
  };
  const [values, setValues] = useState(initialValues);
  const [state, action, pending] = useActionState<ProfileActionState, FormData>(
    saveProfileAction,
    { status: 'idle', values: initialValues, errors: {} },
  );

  function update(field: keyof ProfileFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function fieldError(field: keyof ProfileFormValues) {
    return values[field] === state.values[field] ? state.errors[field] : undefined;
  }

  const savedValuesMatch = state.status === 'success'
    && values.nickname.trim() === state.values.nickname
    && values.ageBand === state.values.ageBand
    && values.preferredLanguage === state.values.preferredLanguage
    && values.supportArea === state.values.supportArea;
  const firstFieldError = (Object.keys(state.errors) as (keyof ProfileFormValues)[])
    .map(fieldError)
    .find(Boolean);

  return (
    <form className="surface profile-form" action={action} noValidate>
      <p className="form-security-note">{translate(locale, 'demo.banner')}</p>
      <div className="profile-fields">
        <div className="form-field">
          <label htmlFor="profile-nickname">{translate(locale, 'profile.nickname')}</label>
          <input
            id="profile-nickname"
            name="nickname"
            type="text"
            autoComplete="off"
            required
            maxLength={60}
            value={values.nickname}
            onChange={(event) => update('nickname', event.target.value)}
            aria-invalid={Boolean(fieldError('nickname'))}
            aria-describedby={fieldError('nickname') ? 'nickname-hint nickname-error' : 'nickname-hint'}
          />
          <p id="nickname-hint" className="form-field__hint">
            {translate(locale, 'profile.nicknameHint')}
          </p>
          {fieldError('nickname') && <p id="nickname-error" className="form-field__error">
            {translate(locale, fieldError('nickname')!)}
          </p>}
        </div>

        <div className="form-field">
          <label htmlFor="profile-age">{translate(locale, 'profile.ageBand')}</label>
          <select
            id="profile-age"
            name="ageBand"
            required
            value={values.ageBand}
            onChange={(event) => update('ageBand', event.target.value)}
            aria-invalid={Boolean(fieldError('ageBand'))}
            aria-describedby={fieldError('ageBand') ? 'age-error' : undefined}
          >
            <option value="" disabled>{translate(locale, 'common.required')}</option>
            {ageBands.map((age) => <option value={age} key={age}>
              {translate(locale, `profile.age.${age}`)}
            </option>)}
          </select>
          {fieldError('ageBand') && <p id="age-error" className="form-field__error">
            {translate(locale, fieldError('ageBand')!)}
          </p>}
        </div>

        <div className="form-field">
          <label htmlFor="profile-language">{translate(locale, 'profile.preferredLanguage')}</label>
          <select
            id="profile-language"
            name="preferredLanguage"
            required
            value={values.preferredLanguage}
            onChange={(event) => update('preferredLanguage', event.target.value)}
            aria-invalid={Boolean(fieldError('preferredLanguage'))}
            aria-describedby={fieldError('preferredLanguage') ? 'language-error' : undefined}
          >
            <option value="" disabled>{translate(locale, 'common.required')}</option>
            {preferredLanguages.map((language) => <option value={language} key={language}>
              {translate(locale, language === 'ru' ? 'common.russian' : 'common.kazakh')}
            </option>)}
          </select>
          {fieldError('preferredLanguage') && <p id="language-error" className="form-field__error">
            {translate(locale, fieldError('preferredLanguage')!)}
          </p>}
        </div>

        <div className="form-field">
          <label htmlFor="profile-support">{translate(locale, 'profile.supportArea')}</label>
          <select
            id="profile-support"
            name="supportArea"
            required
            value={values.supportArea}
            onChange={(event) => update('supportArea', event.target.value)}
            aria-invalid={Boolean(fieldError('supportArea'))}
            aria-describedby={fieldError('supportArea') ? 'support-error' : undefined}
          >
            <option value="" disabled>{translate(locale, 'common.required')}</option>
            {supportAreas.map((area) => <option value={area} key={area}>
              {translate(locale, `support.${area}`)}
            </option>)}
          </select>
          {fieldError('supportArea') && <p id="support-error" className="form-field__error">
            {translate(locale, fieldError('supportArea')!)}
          </p>}
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="button button-primary" disabled={pending}>
          {pending ? translate(locale, 'profile.saving') : translate(locale, 'profile.save')}
        </button>
      </div>
      <p className="form-status" aria-live="polite" role={state.status === 'error' ? 'alert' : 'status'}>
        {savedValuesMatch && translate(locale, 'profile.saved')}
        {state.formError && translate(locale, state.formError)}
        {!state.formError && firstFieldError && translate(locale, firstFieldError)}
      </p>
    </form>
  );
}
