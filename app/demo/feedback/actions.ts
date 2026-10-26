'use server';

import { requireDemoUser } from '@/lib/auth';
import { saveFeedbackForUser } from '@/lib/data/feedback';
import { feedbackSchema, type FeedbackValues } from '@/lib/validation/feedback';

export type FeedbackActionState = {
  status: 'idle' | 'success' | 'invalid' | 'error' | 'conflict';
  values: FeedbackValues;
};

export async function saveFeedbackAction(
  _previous: FeedbackActionState, formData: FormData,
): Promise<FeedbackActionState> {
  const user = await requireDemoUser('/demo/feedback');
  const field = (name: keyof FeedbackValues) => {
    const value = formData.get(name);
    return typeof value === 'string' ? value.slice(0, 100) : '';
  };
  const values: FeedbackValues = {
    submissionId: field('submissionId'), entryPoint: field('entryPoint'),
    outcome: field('outcome'), ease: field('ease'), difficulty: field('difficulty'),
  };
  const parsed = feedbackSchema.safeParse(values);
  if (!parsed.success) return { status: 'invalid', values };
  try {
    const result = await saveFeedbackForUser(user.id, parsed.data);
    return { status: result === 'conflict' ? 'conflict' : 'success', values };
  } catch {
    console.error('Demo feedback save failed');
    return { status: 'error', values };
  }
}
