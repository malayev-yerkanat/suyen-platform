import { z } from 'zod';

export const ageBands = ['0_3', '4_6', '7_10', '11_17'] as const;
export const supportAreas = [
  'speech_language',
  'developmental_education',
  'neuropsychology',
  'adaptive_physical_activity',
] as const;
export const preferredLanguages = ['ru', 'kk'] as const;

export const profileSchema = z.object({
  nickname: z.string().trim().min(1).max(60),
  ageBand: z.enum(ageBands),
  preferredLanguage: z.enum(preferredLanguages),
  supportArea: z.enum(supportAreas),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export type ProfileFormValues = {
  nickname: string;
  ageBand: string;
  preferredLanguage: string;
  supportArea: string;
};
