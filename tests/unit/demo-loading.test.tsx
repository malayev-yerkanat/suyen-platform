import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ locale: vi.fn() }));
vi.mock('@/lib/i18n/locale', () => ({ getLocale: mocks.locale }));
import DemoLoading from '@/app/demo/loading';

test.each([['ru', 'Загрузка…'], ['kk', 'Жүктелуде…']])('loading status is localized and skeleton is decorative (%s)', async (locale, label) => {
  mocks.locale.mockResolvedValue(locale);
  const document = new DOMParser().parseFromString(renderToStaticMarkup(await DemoLoading()), 'text/html');
  expect(document.querySelector('[role="status"]')?.textContent).toBe(label);
  expect(document.querySelector('.demo-loading__skeleton')?.getAttribute('aria-hidden')).toBe('true');
  expect(document.querySelector('a, button, input')).toBeNull();
});
