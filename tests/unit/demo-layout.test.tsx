import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ locale: 'ru' as 'ru' | 'kk' }));
vi.mock('@/lib/i18n/locale', () => ({ getLocale: async () => state.locale }));
vi.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: async () => null }));
vi.mock('@/app/demo/login/actions', () => ({ signOutAction: vi.fn() }));
vi.mock('@/components/LocaleSwitch', () => ({ LocaleSwitch: () => <button>Language</button> }));
import DemoLayout from '@/app/demo/layout';

afterEach(cleanup);
describe('demo skip navigation', () => {
  it.each(['ru', 'kk'] as const)('provides the first link to focusable content in %s', async (locale) => {
    state.locale = locale;
    render(await DemoLayout({ children: <main>Page content</main> }));
    const link = screen.getAllByRole('link')[0];
    expect(link).toHaveTextContent(locale === 'ru' ? 'Перейти к содержимому' : 'Мазмұнға өту');
    expect(link).toHaveAttribute('href', '#demo-main');
    const target = document.getElementById('demo-main');
    expect(target).toContainElement(screen.getByRole('main'));
    expect(target).toHaveAttribute('tabindex', '-1');
    target?.focus();
    expect(target).toHaveFocus();
  });
});
