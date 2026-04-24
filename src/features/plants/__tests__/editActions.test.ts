import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PlantaDB, __setDB } from '../../../data/db';
import {
  careTasksRepo,
  potsRepo,
  speciesRepo,
} from '../../../data/repositories';
import { newId } from '../../../data/ids';
import { buildInitialTasks } from '../../../domain/schedule';
import { saveCustomSchedule, updatePotParams } from '../editActions';
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
    watering_interval_days: 10,
    fertilizing_interval_days: 14,
    misting_interval_days: 3,
    repotting_interval_days: 365,
    pruning_interval_days: 30,
    cleaning_interval_days: 30,
  },
};

const makePot = (overrides: Partial<Pot> = {}): Pot => ({
  id: newId(),
  species_id: species.id,
  display_name: 'Pot',
  photo_blob_id: null,
  site_id: null,
  created_at: NOW,
  notes: null,
  pot_size: 'm',
  pot_material: 'plastic',
  soil_type: 'standard',
  light_level: 'medium',
  location_type: 'indoor',
  use_custom_schedule: false,
  custom_schedule: null,
  ...overrides,
});

let db: PlantaDB;
let counter = 0;

beforeEach(async () => {
  db = new PlantaDB(`planta-edit-actions-${++counter}`);
  __setDB(db);
  await speciesRepo.bulkUpsert([species]);
});

afterEach(async () => {
  await db.delete();
  __setDB(null);
});

describe('updatePotParams (auto schedule)', () => {
  it('recalculates intervals and re-anchors next_due_at from last_performed_at', async () => {
    const pot = makePot();
    const tasks = buildInitialTasks(pot, species, newId);
    await potsRepo.create(pot, tasks);

    const water = tasks.find((t) => t.action_type === 'watering')!;
    // mark as watered 2 days ago
    const lastWatered = NOW - 2 * DAY;
    await careTasksRepo.update({
      ...water,
      last_performed_at: lastWatered,
      next_due_at: lastWatered + water.interval_days * DAY,
    });

    // change pot to XL → 10 * 1.6 = 16
    const updatedPot: Pot = { ...pot, pot_size: 'xl' };
    const freshTasks = await careTasksRepo.listByPot(pot.id);
    await updatePotParams({ updatedPot, species, tasks: freshTasks });

    const after = await careTasksRepo.listByPot(pot.id);
    const waterAfter = after.find((t) => t.action_type === 'watering')!;
    expect(waterAfter.interval_days).toBe(16);
    expect(waterAfter.next_due_at).toBe(lastWatered + 16 * DAY);
  });
});

describe('updatePotParams (custom schedule on)', () => {
  it('does NOT touch task intervals (§8.3)', async () => {
    const pot = makePot({
      use_custom_schedule: true,
      custom_schedule: {
        watering_interval_days: 5,
        fertilizing_interval_days: null,
        misting_interval_days: null,
        repotting_interval_days: null,
        pruning_interval_days: null,
        cleaning_interval_days: null,
      },
    });
    // pre-build tasks with the custom interval
    const tasks = buildInitialTasks(pot, species, newId);
    await potsRepo.create(pot, tasks);
    const water = tasks.find((t) => t.action_type === 'watering')!;
    expect(water.interval_days).toBe(5);

    // change pot_size to XL — would normally push watering to 16 if auto
    const updatedPot: Pot = { ...pot, pot_size: 'xl' };
    const freshTasks = await careTasksRepo.listByPot(pot.id);
    await updatePotParams({ updatedPot, species, tasks: freshTasks });

    const waterAfter = (await careTasksRepo.listByPot(pot.id)).find(
      (t) => t.action_type === 'watering',
    )!;
    expect(waterAfter.interval_days).toBe(5);
  });
});

describe('saveCustomSchedule', () => {
  it('enabled=true writes custom values and updates task intervals', async () => {
    const pot = makePot();
    const tasks = buildInitialTasks(pot, species, newId);
    await potsRepo.create(pot, tasks);

    await saveCustomSchedule({
      pot,
      species,
      tasks,
      enabled: true,
      values: {
        watering_interval_days: 4,
        fertilizing_interval_days: 20,
        misting_interval_days: 2,
        repotting_interval_days: 400,
        pruning_interval_days: 45,
        cleaning_interval_days: 60,
      },
    });

    const updatedPot = await potsRepo.getById(pot.id);
    expect(updatedPot?.use_custom_schedule).toBe(true);
    expect(updatedPot?.custom_schedule?.watering_interval_days).toBe(4);

    const after = await careTasksRepo.listByPot(pot.id);
    const water = after.find((t) => t.action_type === 'watering')!;
    expect(water.interval_days).toBe(4);
    expect(water.next_due_at).toBe(pot.created_at + 4 * DAY);
    const fert = after.find((t) => t.action_type === 'fertilizing')!;
    expect(fert.interval_days).toBe(20);
  });

  it('enabled=false reverts to calculated intervals', async () => {
    const pot = makePot({
      use_custom_schedule: true,
      custom_schedule: {
        watering_interval_days: 99,
        fertilizing_interval_days: 99,
        misting_interval_days: 99,
        repotting_interval_days: 99,
        pruning_interval_days: 99,
        cleaning_interval_days: 99,
      },
    });
    // pretend all tasks were created at 99 days
    const tasks = buildInitialTasks(pot, species, newId);
    await potsRepo.create(pot, tasks);

    await saveCustomSchedule({
      pot,
      species,
      tasks,
      enabled: false,
      values: {
        watering_interval_days: 99,
        fertilizing_interval_days: 99,
        misting_interval_days: 99,
        repotting_interval_days: 99,
        pruning_interval_days: 99,
        cleaning_interval_days: 99,
      },
    });

    const updatedPot = await potsRepo.getById(pot.id);
    expect(updatedPot?.use_custom_schedule).toBe(false);
    expect(updatedPot?.custom_schedule).toBeNull();

    const after = await careTasksRepo.listByPot(pot.id);
    const water = after.find((t) => t.action_type === 'watering')!;
    // Species default 10d · pot_size m = 10
    expect(water.interval_days).toBe(10);
    const fert = after.find((t) => t.action_type === 'fertilizing')!;
    expect(fert.interval_days).toBe(14);
  });

  it('enabled=true but with a null for one action falls back to calculated for that action', async () => {
    const pot = makePot();
    const tasks = buildInitialTasks(pot, species, newId);
    await potsRepo.create(pot, tasks);

    await saveCustomSchedule({
      pot,
      species,
      tasks,
      enabled: true,
      values: {
        watering_interval_days: 5,
        fertilizing_interval_days: null,
        misting_interval_days: null,
        repotting_interval_days: null,
        pruning_interval_days: null,
        cleaning_interval_days: null,
      },
    });

    const after = await careTasksRepo.listByPot(pot.id);
    const water = after.find((t) => t.action_type === 'watering')!;
    expect(water.interval_days).toBe(5);
    const fert = after.find((t) => t.action_type === 'fertilizing')!;
    expect(fert.interval_days).toBe(14); // fell back to calculated
  });
});
