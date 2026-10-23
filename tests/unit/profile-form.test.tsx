import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { ProfileForm } from '@/app/demo/profile/ProfileForm';

const actionState = vi.hoisted(() => ({
  current: {
    status: 'error' as const,
    values: { nickname: '', ageBand: '', preferredLanguage: '', supportArea: '' },
    errors: { nickname: 'profile.error.nickname' as const },
  },
}));

vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useActionState: () => [actionState.current, vi.fn(), false],
}));
vi.mock('@/app/demo/profile/actions', () => ({ saveProfileAction: vi.fn() }));

afterEach(cleanup);

test('clearing a field error removes the empty error status', () => {
  render(<ProfileForm locale="ru" initialProfile={null} />);

  const status = screen.getByRole('alert');
  expect(status.className).toContain('form-status--error');
  fireEvent.change(screen.getByLabelText(/имя|аты|nickname/i), { target: { value: 'Amina' } });

  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.getByRole('status').className).not.toContain('form-status--error');
});
