'use client';

import { MotionButton } from '@/components/MotionButton';

import { useActionState, useRef } from 'react';
import { useFormStatus } from 'react-dom';

import { cancelBookingAction, type BookingActionState } from '@/app/demo/bookings/actions';
import { translate, type Locale } from '@/lib/i18n/catalog';

const initialState: BookingActionState = { status: 'idle' };

function CancelButtons({ locale, onKeep }: { locale: Locale; onKeep: () => void }) {
  const { pending } = useFormStatus();
  return (
    <div className="dashboard-actions">
      <MotionButton className="button" type="submit" disabled={pending}>
        {translate(locale, pending ? 'booking.cancelling' : 'booking.cancel')}
      </MotionButton>
      <button className="button" type="button" disabled={pending} onClick={onKeep}>
        {translate(locale, 'booking.keep')}
      </button>
    </div>
  );
}

export function CancelBooking({ bookingId, locale }: { bookingId: string; locale: Locale }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  function keepBooking() {
    if (detailsRef.current) detailsRef.current.open = false;
    summaryRef.current?.focus();
  }
  const [state, action] = useActionState(cancelBookingAction, initialState);
  return (
    <details ref={detailsRef} className="booking-cancel">
      <summary ref={summaryRef} className="button">{translate(locale, 'booking.cancel')}</summary>
      <div className="booking-cancel-confirm">
        <p>{translate(locale, 'booking.cancelConfirm')}</p>
        <p>{translate(locale, 'booking.cancelHint')}</p>
        <form action={action}>
          <input type="hidden" name="bookingId" value={bookingId} />
          <CancelButtons locale={locale} onKeep={keepBooking} />
        </form>
        {state.error && <p role="alert" className="auth-error">{translate(locale, state.error)}</p>}
      </div>
    </details>
  );
}
