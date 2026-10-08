'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { reserveBookingAction, type BookingActionState } from '@/app/demo/bookings/actions';
import { translate, type Locale } from '@/lib/i18n/catalog';

const initialState: BookingActionState = { status: 'idle' };

function ConfirmButton({ locale }: { locale: Locale }) {
  const { pending } = useFormStatus();
  return (
    <button className="button button-primary" type="submit" disabled={pending}>
      {translate(locale, pending ? 'booking.confirming' : 'booking.confirm')}
    </button>
  );
}

export function BookingReview({
  profileId, slotId, locale,
}: { profileId: string; slotId: string; locale: Locale }) {
  const [state, action] = useActionState(reserveBookingAction, initialState);

  return (
    <form action={action} className="booking-action-form">
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="slotId" value={slotId} />
      {state.error && <p role="alert" className="auth-error">{translate(locale, state.error)}</p>}
      {state.error === 'booking.conflict' && (
        <a className="button" href="/demo/specialists">
          {translate(locale, 'booking.new')}
        </a>
      )}
      <ConfirmButton locale={locale} />
    </form>
  );
}
