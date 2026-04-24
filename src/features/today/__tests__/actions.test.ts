import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PlantaDB, __setDB } from '../../../data/db';
import {
  careLogsRepo,
  careTasksRepo,
  potsRepo,
  speciesRepo,
} from '../../../data/repositories';
import { newId } from '../../../data/ids';
import { buildInitialTasks } from '../../../domain/schedule';
import { completeTask, skipTask, snoozeTask } from '../actions';
import type { PlantSpecies, Pot } from '../../../domain/types';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 3, 14, 12, 0, 0);

const species: PlantSpecies = {
  id: 'sp',
  common_name: 'Rose',
  scientific_name: 'Rosa',
  family: 'Rosaceae',
  description: '',
  image_url: null,
  difficulty: 'moderate',
  light_requirement: 'bright_indirect',
  toxicity: 'non_toxic',
  tags: [],
  care_defaults: {
    watering_interval_days: 7,
    fertilizing_interval_days: 14,
    misting_interval_days: 3,
    repotting_interval_days: 365,
    pruning_interval_days: 30,
    cleaning_interval_days: 30,
  },
};

const makePot = (): Pot => ({
  id: newId(),
  species_id: species.id,
  display_name: 'Pot',
  photo_blob_id: null,
  site_id: null,
  created_at: NOW - 30 * DAY,
  notes: null,
  pot_size: 'm',
  pot_material: 'plastic',
  soil_type: 'standard',
  light_level: 'medium',
  location_type: 'indoor',
  use_custom_schedule: false,
  custom_schedule: null,
});

let db: PlantaDB;
let counter = 0;

beforeEach(async () => {
  db = new PlantaDB(`planta-today-actions-${++counter}`);
  __setDB(db);
  await speciesRepo.bulkUpsert([species]);
});

afterEach(async () => {
  await db.delete();
  __setDB(null);
});

describe('Today actions', () => {
  it('completeTask writes a completed log and advances next_due_at', async () => {
    const pot = makePot();
    const tasks = buildInitialTasks(pot, species, newId);
    await potsRepo.create(pot, tasks);
    const watering = tasks.find((t) => t.action_type === 'watering')!;

    await completeTask(watering.id, null, NOW);

    const updated = await careTasksRepo.getById(watering.id);
    expect(updated?.last_performed_at).toBe(NOW);
    expect(updated?.next_due_at).toBe(NOW + watering.interval_days * DAY);
    const logs = await careLogsRepo.listByTask(watering.id);
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('completed');
  });

  it('skipTask writes a skipped log and advances next_due_at', async () => {
    const pot = makePot();
    const tasks = buildInitialTasks(pot, species, newId);
    await potsRepo.create(pot, tasks);
    const fert = tasks.find((t) => t.action_type === 'fertilizing')!;

    await skipTask(fert.id, NOW);

    const updated = await careTasksRepo.getById(fert.id);
    expect(updated?.last_performed_at).toBe(NOW);
    expect(updated?.next_due_at).toBe(NOW + 14 * DAY);
    const logs = await careLogsRepo.listByTask(fert.id);
    expect(logs[0].action).toBe('skipped');
  });

  it('snoozeTask sets snooze_until but does NOT change next_due_at (§4.5)', async () => {
    const pot = makePot();
    const tasks = buildInitialTasks(pot, species, newId);
    await potsRepo.create(pot, tasks);
    const water = tasks.find((t) => t.action_type === 'watering')!;
    const originalDue = water.next_due_at;

    await snoozeTask(water.id, NOW + 2 * DAY, NOW);

    const updated = await careTasksRepo.getById(water.id);
    expect(updated?.snooze_until).toBe(NOW + 2 * DAY);
    expect(updated?.next_due_at).toBe(originalDue);
    const logs = await careLogsRepo.listByTask(water.id);
    expect(logs[0].action).toBe('snoozed');
  });

  it('no-op on missing task id', async () => {
    await expect(completeTask('missing-id', null, NOW)).resolves.toBeUndefined();
  });
});
