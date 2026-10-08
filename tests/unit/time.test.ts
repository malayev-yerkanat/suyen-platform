import { describe, expect, it } from 'vitest';

import { formatAlmatyDateTime } from '@/lib/time';

describe('Almaty date-time formatting', () => {
  it('shows a UTC instant in the Almaty zone with a derived offset', () => {
    const display = formatAlmatyDateTime('2026-10-08T00:00:00.000Z', 'ru');
    expect(display).toContain('05:00');
    expect(display).toContain('Asia/Almaty');
    expect(display).toMatch(/(?:GMT|UTC)\+5/);
  });

  it('formats in Kazakh', () => {
    const display = formatAlmatyDateTime('2026-10-08T00:00:00.000Z', 'kk');
    expect(display).toContain('05:00');
    expect(display).toContain('Asia/Almaty');
  });

  it('derives the offset from the date instead of fixing the current offset', () => {
    const historical = formatAlmatyDateTime('2020-10-08T00:00:00.000Z', 'ru');
    expect(historical).toContain('06:00');
    expect(historical).toMatch(/(?:GMT|UTC)\+6/);
  });

  it('rejects an invalid instant', () => {
    expect(() => formatAlmatyDateTime('not a date', 'ru')).toThrow(RangeError);
  });
});
