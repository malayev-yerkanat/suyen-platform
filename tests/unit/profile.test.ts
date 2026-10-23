import { describe, expect, it } from 'vitest';

import { profileSchema } from '@/lib/validation/profile';

const validProfile = {
  nickname: '  Алия  ',
  ageBand: '4_6',
  preferredLanguage: 'kk',
  supportArea: 'speech_language',
};

describe('profileSchema', () => {
  it('trims a valid synthetic nickname and accepts the four allowed fields', () => {
    expect(profileSchema.parse(validProfile)).toEqual({ ...validProfile, nickname: 'Алия' });
  });

  it.each(['', '   ', 'x'.repeat(61)])('rejects an empty or long nickname', (nickname) => {
    expect(profileSchema.safeParse({ ...validProfile, nickname }).success).toBe(false);
  });

  it.each([
    ['ageBand', '18_25'],
    ['preferredLanguage', 'en'],
    ['supportArea', 'medical_diagnosis'],
  ] as const)('rejects invalid %s', (field, value) => {
    expect(profileSchema.safeParse({ ...validProfile, [field]: value }).success).toBe(false);
  });

  it('does not preserve extra personal or medical data', () => {
    expect(profileSchema.parse({ ...validProfile, diagnosis: 'private', notes: 'private' }))
      .toEqual({ ...validProfile, nickname: 'Алия' });
  });
});
