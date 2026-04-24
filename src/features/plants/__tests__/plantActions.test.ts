import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PlantaDB, __setDB } from '../../../data/db';
import {
  careLogsRepo,
  careTasksRepo,
  journalRepo,
  potsRepo,
  speciesRepo,
} from '../../../data/repositories';
import { newId } from '../../../data/ids';
import { buildInitialTasks } from '../../../domain/schedule';
import { deletePot, renamePot, toggleTaskEnabled } from '../actions';
import type { PlantSpecies, Pot } from '../../../domain/types';

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
  display_name: 'Original Name',
  photo_blob_id: null,
  site_id: null,
  created_at: Date.now(),
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
  db = new PlantaDB(`planta-plant-actions-${++counter}`);
  __setDB(db);
  await speciesRepo.bulkUpsert([species]);
});

afterEach(async () => {
  await db.delete();
  __setDB(null);
});

describe('toggleTaskEnabled', () => {
  it('flips is_enabled and persists', async () => {
    const pot = makePot();
    const tasks = buildInitialTasks(pot, species, newId);
    await potsRepo.create(pot, tasks);
    const watering = tasks.find((t) => t.action_type === 'watering')!;

    await toggleTaskEnabled(watering.id, false);
    const reloaded = await careTasksRepo.getById(watering.id);
    expect(reloaded?.is_enabled).toBe(false);

    await toggleTaskEnabled(watering.id, true);
    const again = await careTasksRepo.getById(watering.id);
    expect(again?.is_enabled).toBe(true);
  });

  it('no-ops on missing id', async () => {
    await expect(toggleTaskEnabled('nope', true)).resolves.toBeUndefined();
  });
});

describe('renamePot', () => {
  it('updates display_name and persists', async () => {
    const pot = makePot();
    await potsRepo.create(pot, buildInitialTasks(pot, species, newId));
    await renamePot(pot.id, '  New name  ');
    const updated = await potsRepo.getById(pot.id);
    expect(updated?.display_name).toBe('New name');
  });

  it('ignores blank names', async () => {
    const pot = makePot();
    await potsRepo.create(pot, []);
    await renamePot(pot.id, '   ');
    const still = await potsRepo.getById(pot.id);
    expect(still?.display_name).toBe('Original Name');
  });
});

describe('deletePot', () => {
  it('removes the pot and cascades tasks, logs, journal (service layer)', async () => {
    const pot = makePot();
    const tasks = buildInitialTasks(pot, species, newId);
    await potsRepo.create(pot, tasks);
    await careLogsRepo.appendMany([
      {
        pot_id: pot.id,
        care_task_id: tasks[0].id,
        action_type: tasks[0].action_type,
        action: 'completed',
        performed_at: Date.now(),
        notes: null,
        photo_blob_id: null,
      },
    ]);
    await journalRepo.create({
      id: newId(),
      pot_id: pot.id,
      created_at: Date.now(),
      content: 'Hi',
      photo_blob_ids: [],
      tags: [],
    });

    await deletePot(pot.id);

    expect(await potsRepo.getById(pot.id)).toBeUndefined();
    expect(await careTasksRepo.listByPot(pot.id)).toHaveLength(0);
    expect(await careLogsRepo.listByPot(pot.id)).toHaveLength(0);
    expect(await journalRepo.listByPot(pot.id)).toHaveLength(0);
  });
});
