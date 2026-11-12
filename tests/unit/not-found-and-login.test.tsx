import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ locale: 'ru' as 'ru' | 'kk', pending: false }));
vi.mock('@/lib/i18n/locale', () => ({ getLocale: async () => state.locale }));
vi.mock('react-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-dom')>()),
  useFormStatus: () => ({ pending: state.pending }),
}));

import NotFound from '@/app/not-found';
import { SubmitButton } from '@/app/demo/login/SubmitButton';

afterEach(() => { cleanup(); state.pending = false; });

describe('not found page', () => {
  it.each([
    ['ru', 'Страница не найдена', 'Главная'],
    ['kk', 'Бет табылмады', 'Басты бет'],
  ] as const)('offers a way back in %s', async (locale, title, home) => {
    state.locale = locale;
    const html = renderToStaticMarkup(await NotFound());
    expect(html).toContain(title);
    expect(html).toContain(`href="/"`);
    expect(html).toContain(`>${home}<`);
    expect(html).toContain('href="/demo"');
  });
});

describe('login submit button', () => {
  it('reads as the action when idle', () => {
    render(<SubmitButton label="Войти" pendingLabel="Входим…" />);
    expect(screen.getByRole('button', { name: 'Войти' })).toBeEnabled();
  });

  it('disables itself and says it is signing in while pending', () => {
    state.pending = true;
    render(<SubmitButton label="Войти" pendingLabel="Входим…" />);
    const button = screen.getByRole('button', { name: 'Входим…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('stays disabled when sign-in is not configured', () => {
    render(<SubmitButton label="Войти" pendingLabel="Входим…" disabled />);
    expect(screen.getByRole('button', { name: 'Войти' })).toBeDisabled();
  });
});
