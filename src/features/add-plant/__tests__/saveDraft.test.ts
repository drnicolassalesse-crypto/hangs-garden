import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PlantaDB, __setDB } from '../../../data/db';
import { careTasksRepo, potsRepo, speciesRepo } from '../../../data/repositories';
import { defaultDraft } from '../draft';
import { saveDraft } from '../saveDraft';
import type { PlantSpecies } from '../../../domain/types';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 3, 13, 12, 0, 0);

const sampleSpecies = (): PlantSpecies => ({
  id: 'sp-monstera',
  common_name: 'Monstera',
  scientific_name: 'Monstera deliciosa',
  family: 'Araceae',
  description: '',
  image_url: null,
  difficulty: 'moderate',
  light_requirement: 'bright_indirect',
  toxicity: 'toxic_to_pets',
  tags: [],
  care_defaults: {
    watering_interval_days: 7,
    fertilizing_interval_days: 14,
    misting_interval_days: 4,
    repotting_interval_days: 730,
    pruning_interval_days: 90,
    cleaning_interval_days: 21,
  },
});

let db: PlantaDB;
let counter = 0;

beforeEach(async () => {
  db = new PlantaDB(`planta-savedraft-test-${++counter}`);
  __setDB(db);
  await speciesRepo.bulkUpsert([sampleSpecies()]);
});

afterEach(async () => {
  await db.delete();
  __setDB(null);
});

describe('saveDraft', () => {
  it('creates a pot row + 6 enabled tasks with calculated intervals', async () => {
    const sp = sampleSpecies();
    const draft = {
      ...defaultDraft(),
      species_id: sp.id,
      display_name: 'My Monstera',
      pot_size: 'xl' as const,
    };

    const { pot } = await saveDraft(draft, sp, NOW);

    const stored = await potsRepo.getById(pot.id);
    expect(stored?.display_name).toBe('My Monstera');
    expect(stored?.pot_size).toBe('xl');

    const tasks = await careTasksRepo.listByPot(pot.id);
    expect(tasks).toHaveLength(6);
    expect(tasks.every((t) => t.is_enabled)).toBe(true);

    // XL multiplier 1.6 → watering 7 * 1.6 = 11.2 → round → 11
    const watering = tasks.find((t) => t.action_type === 'watering')!;
    expect(watering.interval_days).toBe(11);
    expect(watering.next_due_at).toBe(NOW + 11 * DAY);

    // Other actions are not affected by pot params (spec §4.3 note)
    const fertilize = tasks.find((t) => t.action_type === 'fertilizing')!;
    expect(fertilize.interval_days).toBe(14);
    expect(fertilize.next_due_at).toBe(NOW + 14 * DAY);
  });

  it('past last_watered_at yields an immediately overdue watering task (§8.4)', async () => {
    const sp = sampleSpecies();
    const tenDaysAgo = NOW - 10 * DAY;
    const draft = {
      ...defaultDraft(),
      species_id: sp.id,
      display_name: 'Thirsty pot',
      last_watered_at: tenDaysAgo,
    };

    const { pot } = await saveDraft(draft, sp, NOW);
    const tasks = await careTasksRepo.listByPot(pot.id);
    const watering = tasks.find((t) => t.action_type === 'watering')!;

    expect(watering.last_performed_at).toBe(tenDaysAgo);
    // baseline interval 7 days, last watered 10 days ago → next_due_at 3 days in the past
    expect(watering.next_due_at).toBe(tenDaysAgo + 7 * DAY);
    expect(watering.next_due_at).toBeLessThan(NOW);
  });

  it('falls back to species common_name when display_name is blank', async () => {
    const sp = sampleSpecies();
    const draft = {
      ...defaultDraft(),
      species_id: sp.id,
      display_name: '   ',
    };
    const { pot } = await saveDraft(draft, sp, NOW);
    expect(pot.display_name).toBe('Monstera');
  });

  it('throws if species mismatch', async () => {
    const sp = sampleSpecies();
    const draft = {
      ...defaultDraft(),
      species_id: 'other',
      display_name: 'x',
    };
    await expect(saveDraft(draft, sp, NOW)).rejects.toThrow(/does not match/);
  });
});
