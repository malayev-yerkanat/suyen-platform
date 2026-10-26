import { describe, expect, it } from 'vitest';
import { feedbackSchema, feedbackEntryPoint } from '@/lib/validation/feedback';

const valid = { submissionId: '13c9cf98-242f-4a76-aa03-548717583a10', entryPoint: 'dashboard', outcome: 'yes', ease: '5', difficulty: 'none' };
describe('feedback validation', () => {
  it('accepts fixed structured fields and converts ease to a number', () => {
    expect(feedbackSchema.parse(valid).ease).toBe(5);
  });
  it.each([{ ease: '' }, { ease: '6' }, { ease: '1.5' }, { outcome: 'maybe' }, { difficulty: 'medical text' }, { submissionId: 'bad' }, { entryPoint: 'external' }])('rejects malformed fields %j', (change) => {
    expect(feedbackSchema.safeParse({ ...valid, ...change }).success).toBe(false);
  });
  it('uses a safe entry point for malformed and repeated query values', () => {
    expect(feedbackEntryPoint(['confirmation', 'cancellation'])).toBe('dashboard');
    expect(feedbackEntryPoint('confirmation')).toBe('confirmation');
    expect(feedbackEntryPoint(undefined)).toBe('dashboard');
  });
});
