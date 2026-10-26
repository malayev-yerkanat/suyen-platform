import 'server-only';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { FeedbackInput } from '@/lib/validation/feedback';

export async function saveFeedbackForUser(ownerId: string, input: FeedbackInput): Promise<'saved' | 'conflict'> {
  const client = await createServerSupabaseClient();
  if (!client) throw new Error('Supabase is not configured');
  const { error } = await client.from('demo_feedback').insert({
    owner_id: ownerId,
    submission_id: input.submissionId,
    entry_point: input.entryPoint,
    outcome: input.outcome,
    ease: input.ease,
    difficulty: input.difficulty,
  });
  if (!error) return 'saved';
  if (error.code !== '23505') throw error;

  // A lost response may cause the same immutable submission to be retried.
  const { data, error: readError } = await client.from('demo_feedback')
    .select('submission_id,entry_point,outcome,ease,difficulty').eq('owner_id', ownerId)
    .eq('submission_id', input.submissionId).maybeSingle();
  if (readError) throw readError;
  if (!data) throw error;
  const matches = data.entry_point === input.entryPoint && data.outcome === input.outcome
    && data.ease === input.ease && data.difficulty === input.difficulty;
  return matches ? 'saved' : 'conflict';
}
