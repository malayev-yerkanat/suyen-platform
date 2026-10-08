import { describe, expect, it } from 'vitest';

import { catalog, resolveLocale, translate } from '@/lib/i18n/catalog';

describe('language catalog', () => {
  it('has exactly the same keys in Russian and Kazakh', () => {
    expect(Object.keys(catalog.ru).sort()).toEqual(Object.keys(catalog.kk).sort());
  });

  it('does not contain empty or untranslated values', () => {
    for (const locale of ['ru', 'kk'] as const) {
      for (const value of Object.values(catalog[locale])) {
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('defaults an invalid cookie to Russian', () => {
    expect(resolveLocale(undefined)).toBe('ru');
    expect(resolveLocale('en')).toBe('ru');
    expect(resolveLocale('kk')).toBe('kk');
  });

  it('looks up a key in the selected language', () => {
    expect(translate('ru', 'common.language')).toBe('Язык');
    expect(translate('kk', 'common.language')).toBe('Тіл');
  });
});
