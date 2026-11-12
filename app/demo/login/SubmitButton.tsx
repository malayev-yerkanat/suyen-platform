'use client';

import { useFormStatus } from 'react-dom';

/** Disables itself and says so while the sign-in request is in flight. */
export function SubmitButton({ label, pendingLabel, disabled }: {
  label: string;
  pendingLabel: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button className="button button-primary" type="submit" disabled={disabled || pending} aria-busy={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}
