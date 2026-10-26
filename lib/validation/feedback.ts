import { z } from 'zod';

export const feedbackOutcomes = ['yes', 'partially', 'no'] as const;
export const feedbackDifficulties = ['finding_specialist', 'choosing_time', 'booking', 'cancellation', 'language_navigation', 'none'] as const;
export const feedbackEntryPoints = ['dashboard', 'confirmation', 'cancellation'] as const;
export const feedbackSchema = z.object({
  submissionId: z.uuid(),
  entryPoint: z.enum(feedbackEntryPoints),
  outcome: z.enum(feedbackOutcomes),
  ease: z.enum(['1', '2', '3', '4', '5']).transform(Number),
  difficulty: z.enum(feedbackDifficulties),
});
export type FeedbackInput = z.output<typeof feedbackSchema>;
export type FeedbackValues = Record<keyof FeedbackInput, string>;
export function feedbackEntryPoint(value: string | string[] | undefined): FeedbackInput['entryPoint'] {
  const result = z.enum(feedbackEntryPoints).safeParse(value);
  return result.success ? result.data : 'dashboard';
}
