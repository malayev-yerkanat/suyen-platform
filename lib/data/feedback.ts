import 'server-only';

import { requireAppPool } from '@/lib/db';
import type { FeedbackInput } from '@/lib/validation/feedback';

type FeedbackRow = {
  entry_point: string;
  outcome: string;
  ease: number;
  difficulty: string;
};

export async function saveFeedbackForUser(ownerId: string, input: FeedbackInput): Promise<'saved' | 'conflict'> {
  const pool = requireAppPool();
  const values = [ownerId, input.submissionId, input.entryPoint, input.outcome, input.ease, input.difficulty];
  const inserted = await pool.query(
    `insert into public.demo_feedback
       (owner_id, submission_id, entry_point, outcome, ease, difficulty)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (owner_id, submission_id) do nothing
     returning submission_id`,
    values,
  );
  if (inserted.rowCount === 1) return 'saved';

  // A lost response may cause the same immutable submission to be retried.
  const { rows } = await pool.query<FeedbackRow>(
    `select entry_point, outcome, ease, difficulty from public.demo_feedback
     where owner_id = $1 and submission_id = $2`,
    [ownerId, input.submissionId],
  );
  const data = rows[0];
  if (!data) throw new Error('Feedback could not be saved');
  const matches = data.entry_point === input.entryPoint && data.outcome === input.outcome
    && data.ease === input.ease && data.difficulty === input.difficulty;
  return matches ? 'saved' : 'conflict';
}
