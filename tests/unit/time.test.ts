import { describe, expect, it } from 'vitest';

import { formatAlmatyDateTime, formatAlmatyTime, formatAlmatyDate, groupSlotsByAlmatyDate } from '@/lib/time';

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


describe('compact availability formatting', () => {
  it('groups by Almaty calendar day and sorts without changing input', () => {
    const slots = [{ id: 'later', startsAt: '2030-01-01T21:00:00Z' }, { id: 'earlier', startsAt: '2030-01-01T18:30:00Z' }, { id: 'midnight', startsAt: '2030-01-01T19:00:00Z' }];
    const groups = groupSlotsByAlmatyDate(slots);
    expect(groups.map((group) => group.date)).toEqual(['2030-01-01', '2030-01-02']);
    expect(groups[1].slots.map((slot) => slot.id)).toEqual(['midnight', 'later']);
    expect(slots[0].id).toBe('later');
    expect(groupSlotsByAlmatyDate([])).toEqual([]);
  });
  it.each(['ru', 'kk'] as const)('provides short localized date and time (%s)', (locale) => {
    expect(formatAlmatyTime('2030-01-01T19:00:00Z', locale)).toBe('00:00');
    expect(formatAlmatyDate('2030-01-01T19:00:00Z', locale)).toContain('2030');
    expect(formatAlmatyDate('2030-01-01T19:00:00Z', locale)).not.toContain('Asia/Almaty');
  });
});
