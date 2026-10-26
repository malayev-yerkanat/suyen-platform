'use client';

import { MotionButton } from '@/components/MotionButton';

import Link from 'next/link';
import { StatusMark } from '@/components/StatusMark';
import { useActionState, useEffect, useRef, useState } from 'react';
import { saveFeedbackAction, type FeedbackActionState } from '@/app/demo/feedback/actions';
import { translate, type Locale } from '@/lib/i18n/catalog';
import { feedbackDifficulties, feedbackOutcomes, type FeedbackInput } from '@/lib/validation/feedback';

type Props = { locale: Locale; submissionId: string; entryPoint: FeedbackInput['entryPoint'] };

export function FeedbackForm({ locale, submissionId, entryPoint }: Props) {
  // Keep the form identity and answers across validation/storage failures and retries.
  const [values, setValues] = useState({ submissionId, entryPoint, outcome: '', ease: '', difficulty: '' });
  const [state, action, pending] = useActionState<FeedbackActionState, FormData>(
    saveFeedbackAction, { status: 'idle', values },
  );
  const successHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (state.status === 'success') successHeading.current?.focus();
  }, [state.status]);
  if (state.status === 'success') return (
    <section className="surface profile-form" role="status">
      <StatusMark />
      <h2 ref={successHeading} tabIndex={-1}>{translate(locale, 'feedback.thanks')}</h2>
      <p>{translate(locale, 'feedback.saved')}</p>
      <Link className="button button-primary" href="/demo">{translate(locale, 'feedback.back')}</Link>
    </section>
  );
  return (
    <form className="surface profile-form feedback-form" action={action} onReset={(event) => event.preventDefault()}>
      <p className="form-security-note">{translate(locale, 'feedback.note')}</p>
      <input type="hidden" name="submissionId" value={values.submissionId} />
      <input type="hidden" name="entryPoint" value={values.entryPoint} />
      <div className="profile-fields">
        <div className="form-field">
          <label htmlFor="feedback-outcome">{translate(locale, 'feedback.outcome')}</label>
          <select id="feedback-outcome" name="outcome" required value={values.outcome}
            onChange={(event) => setValues((current) => ({ ...current, outcome: event.target.value }))}>
            <option value="">{translate(locale, 'feedback.choose')}</option>
            {feedbackOutcomes.map((value) => <option key={value} value={value}>{translate(locale, `feedback.outcome.${value}`)}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="feedback-ease">{translate(locale, 'feedback.ease')}</label>
          <select id="feedback-ease" name="ease" required value={values.ease} aria-describedby="feedback-ease-hint"
            onChange={(event) => setValues((current) => ({ ...current, ease: event.target.value }))}>
            <option value="">{translate(locale, 'feedback.choose')}</option>
            {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <p id="feedback-ease-hint" className="form-field__hint">{translate(locale, 'feedback.easeHint')}</p>
        </div>
        <div className="form-field">
          <label htmlFor="feedback-difficulty">{translate(locale, 'feedback.difficulty')}</label>
          <select id="feedback-difficulty" name="difficulty" required value={values.difficulty}
            onChange={(event) => setValues((current) => ({ ...current, difficulty: event.target.value }))}>
            <option value="">{translate(locale, 'feedback.choose')}</option>
            {feedbackDifficulties.map((value) => <option key={value} value={value}>{translate(locale, `feedback.difficulty.${value}`)}</option>)}
          </select>
        </div>
      </div>
      {(state.status === 'error' || state.status === 'invalid' || state.status === 'conflict') && <p role="alert" className="form-field__error">{translate(locale, `feedback.${state.status}`)}</p>}
      {state.status === 'conflict' && <a className="button button-secondary" href={`/demo/feedback?from=${values.entryPoint}`}>
        {translate(locale, 'feedback.reopen')}
      </a>}
      <MotionButton className="button button-primary" type="submit" disabled={pending || state.status === 'conflict'}>
        {translate(locale, pending ? 'feedback.pending' : 'feedback.submit')}
      </MotionButton>
    </form>
  );
}
