'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { cancelBookingAction, type BookingActionState } from '@/app/demo/bookings/actions';
import { translate, type Locale } from '@/lib/i18n/catalog';

const initialState: BookingActionState = { status: 'idle' };

function CancelButton({ locale }: { locale: Locale }) {
  const { pending } = useFormStatus();
  return (
    <button className="button" type="submit" disabled={pending}>
      {translate(locale, pending ? 'booking.cancelling' : 'common.yes')}
    </button>
  );
}

export function CancelBooking({ bookingId, locale }: { bookingId: string; locale: Locale }) {
  const [state, action] = useActionState(cancelBookingAction, initialState);
  return (
    <details className="booking-cancel">
      <summary className="button">{translate(locale, 'booking.cancel')}</summary>
      <div className="booking-cancel-confirm">
        <p>{translate(locale, 'booking.cancelConfirm')}</p>
        <p>{translate(locale, 'booking.cancelHint')}</p>
        <form action={action}>
          <input type="hidden" name="bookingId" value={bookingId} />
          <CancelButton locale={locale} />
        </form>
        {state.error && <p role="alert" className="auth-error">{translate(locale, state.error)}</p>}
      </div>
    </details>
  );
}
