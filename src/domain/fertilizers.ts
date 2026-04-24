import type { CareLog, UUID } from './types';

/**
 * Returns the fertilizer_id of the most recent 'fertilizing' log with a
 * non-null fertilizer_id, or null if there is no such log.
 *
 * Expects `logs` sorted or unsorted; walks them linearly.
 */
export function pickLastFertilizerId(logs: CareLog[]): UUID | null {
  let latest: CareLog | null = null;
  for (const log of logs) {
    if (log.action_type !== 'fertilizing') continue;
    if (!log.fertilizer_id) continue;
    if (!latest || log.performed_at > latest.performed_at) {
      latest = log;
    }
  }
  return latest?.fertilizer_id ?? null;
}
