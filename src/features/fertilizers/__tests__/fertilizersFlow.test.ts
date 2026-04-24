import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PlantaDB, __setDB } from '../../../data/db';
import {
  careLogsRepo,
  fertilizersRepo,
  potsRepo,
  speciesRepo,
} from '../../../data/repositories';
import { newId } from '../../../data/ids';
import { buildInitialTasks } from '../../../domain/schedule';
import { completeTask } from '../../today/actions';
import { pickLastFertilizerId } from '../../../domain/fertilizers';
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
  display_name: 'Pot',
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
  db = new PlantaDB(`planta-fert-${++counter}`);
  __setDB(db);
  await speciesRepo.bulkUpsert([species]);
});

afterEach(async () => {
  await db.delete();
  __setDB(null);
});

describe('fertilizersRepo', () => {
  it('create + update + delete cycle', async () => {
    const f = await fertilizersRepo.create({
      name: 'Đầu Trâu 20-20-15',
      type: 'granular',
      npk: '20-20-15',
      notes: null,
      photo_blob_id: null,
    });
    expect(f.id).toBeTruthy();
    expect((await fertilizersRepo.listAll()).map((x) => x.id)).toEqual([f.id]);

    await fertilizersRepo.update(f.id, {
      name: 'Đầu Trâu',
      type: 'liquid',
      npk: '20-20-15',
      notes: 'diluted 1:1000',
      photo_blob_id: null,
    });
    const reloaded = await fertilizersRepo.getById(f.id);
    expect(reloaded?.type).toBe('liquid');
    expect(reloaded?.notes).toBe('diluted 1:1000');

    await fertilizersRepo.delete(f.id);
    expect(await fertilizersRepo.getById(f.id)).toBeUndefined();
  });

  it('input trimming: empty npk/notes persist as null', async () => {
    const f = await fertilizersRepo.create({
      name: '  Organic tea  ',
      type: 'organic',
      npk: '   ',
      notes: '',
      photo_blob_id: null,
    });
    expect(f.name).toBe('Organic tea');
    expect(f.npk).toBeNull();
    expect(f.notes).toBeNull();
  });
});

describe('completeTask with fertilizer_id', () => {
  it('writes the fertilizer_id onto the fertilizing log', async () => {
    const pot = makePot();
    const tasks = buildInitialTasks(pot, species, newId);
    await potsRepo.create(pot, tasks);
    const fert = await fertilizersRepo.create({
      name: 'Org tea',
      type: 'organic',
      npk: null,
      notes: null,
      photo_blob_id: null,
    });

    const fertTask = tasks.find((t) => t.action_type === 'fertilizing')!;
    await completeTask(fertTask.id, fert.id);

    const logs = await careLogsRepo.listByTask(fertTask.id);
    expect(logs).toHaveLength(1);
    expect(logs[0].fertilizer_id).toBe(fert.id);
  });

  it('leaves fertilizer_id null for non-fertilize actions even if caller passes one', async () => {
    const pot = makePot();
    const tasks = buildInitialTasks(pot, species, newId);
    await potsRepo.create(pot, tasks);
    const waterTask = tasks.find((t) => t.action_type === 'watering')!;

    await completeTask(waterTask.id, 'fake-id');

    const logs = await careLogsRepo.listByTask(waterTask.id);
    expect(logs[0].fertilizer_id).toBeFalsy();
  });
});

describe('pickLastFertilizerId', () => {
  it('returns the most recent fertilizing log with a non-null id', async () => {
    const pot = makePot();
    await potsRepo.create(pot, []);
    const [a, b] = await Promise.all([
      fertilizersRepo.create({
        name: 'A',
        type: 'liquid',
        npk: null,
        notes: null,
        photo_blob_id: null,
      }),
      fertilizersRepo.create({
        name: 'B',
        type: 'liquid',
        npk: null,
        notes: null,
        photo_blob_id: null,
      }),
    ]);
    await careLogsRepo.appendMany([
      {
        pot_id: pot.id,
        care_task_id: 't',
        action_type: 'fertilizing',
        action: 'completed',
        performed_at: 1000,
        notes: null,
        photo_blob_id: null,
        fertilizer_id: a.id,
      },
      {
        pot_id: pot.id,
        care_task_id: 't',
        action_type: 'fertilizing',
        action: 'completed',
        performed_at: 5000,
        notes: null,
        photo_blob_id: null,
        fertilizer_id: b.id,
      },
      {
        pot_id: pot.id,
        care_task_id: 't',
        action_type: 'watering',
        action: 'completed',
        performed_at: 6000,
        notes: null,
        photo_blob_id: null,
      },
    ]);
    const logs = await careLogsRepo.listByPot(pot.id);
    expect(pickLastFertilizerId(logs)).toBe(b.id);
  });

  it('returns null when no fertilizing log has a fertilizer_id', async () => {
    const pot = makePot();
    await potsRepo.create(pot, []);
    await careLogsRepo.appendMany([
      {
        pot_id: pot.id,
        care_task_id: 't',
        action_type: 'fertilizing',
        action: 'completed',
        performed_at: 1000,
        notes: null,
        photo_blob_id: null,
      },
    ]);
    const logs = await careLogsRepo.listByPot(pot.id);
    expect(pickLastFertilizerId(logs)).toBeNull();
  });

  it('deleting a fertilizer preserves historical logs referencing it', async () => {
    const pot = makePot();
    await potsRepo.create(pot, []);
    const f = await fertilizersRepo.create({
      name: 'X',
      type: 'liquid',
      npk: null,
      notes: null,
      photo_blob_id: null,
    });
    await careLogsRepo.appendMany([
      {
        pot_id: pot.id,
        care_task_id: 't',
        action_type: 'fertilizing',
        action: 'completed',
        performed_at: 1000,
        notes: null,
        photo_blob_id: null,
        fertilizer_id: f.id,
      },
    ]);

    await fertilizersRepo.delete(f.id);

    const logs = await careLogsRepo.listByPot(pot.id);
    expect(logs).toHaveLength(1);
    expect(logs[0].fertilizer_id).toBe(f.id);
    // And lookup returns undefined — callers should render "Deleted".
    expect(await fertilizersRepo.getById(f.id)).toBeUndefined();
  });
});
