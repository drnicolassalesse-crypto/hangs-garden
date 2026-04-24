import type { LightLevel } from '../../domain/types';

/**
 * Maps a lux reading to the four light-level buckets used elsewhere in the
 * app. Ranges come from spec §5.12:
 *
 *   0 – 500      → low
 *   500 – 2 500  → medium
 *   2 500 – 10 000 → bright_indirect
 *   10 000+      → direct_sunlight
 *
 * Upper boundary is inclusive; 500 maps to "low", 501 to "medium", etc.
 */
export function luxToLevel(lux: number): LightLevel {
  if (!Number.isFinite(lux) || lux < 0) return 'low';
  if (lux <= 500) return 'low';
  if (lux <= 2500) return 'medium';
  if (lux <= 10000) return 'bright_indirect';
  return 'direct_sunlight';
}
