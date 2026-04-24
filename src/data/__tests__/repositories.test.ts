import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PlantaDB, __setDB } from '../db';
import {
  careLogsRepo,
  careTasksRepo,
  journalRepo,
  potsRepo,
  profileRepo,
  sitesRepo,
  speciesRepo,
} from '../repositories';
import { buildInitialTasks } from '../../domain/schedule';
import { newId } from '../ids';
import type { PlantSpecies, Pot, Profile } from '../../domain/types';

let db: PlantaDB;
let dbCounter = 0;

beforeEach(() => {
  db = new PlantaDB(`planta-test-${++dbCounter}`);
  __setDB(db);
});

afterEach(async () => {
  await db.delete();
  __setDB(null);
});

const sampleSpecies = (): PlantSpecies => ({
  id: 'sp-rose',
  common_name: 'Rose',
  scientific_name: 'Rosa',
  family: 'Rosaceae',
  description: 'Classic flower',
  image_url: null,
  difficulty: 'moderate',
  light_requirement: 'bright_indirect',
  toxicity: 'non_toxic',
  tags: ['flowering'],
  care_defaults: {
    watering_interval_days: 7,
    fertilizing_interval_days: 14,
    misting_interval_days: 3,
    repotting_interval_days: 365,
    pruning_interval_days: 30,
    cleaning_interval_days: 30,
  },
});

const samplePot = (): Pot => ({
  id: newId(),
  species_id: 'sp-rose',
  display_name: 'Rose Pot 1',
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

describe('speciesRepo', () => {
  it('bulkUpsert + listAll round-trips', async () => {
    await speciesRepo.bulkUpsert([sampleSpecies()]);
    const all = await speciesRepo.listAll();
    expect(all).toHaveLength(1);
    expect(all[0].common_name).toBe('Rose');
    expect(await speciesRepo.count()).toBe(1);
  });
});

describe('sitesRepo', () => {
  it('create / rename / delete', async () => {
    const s = await sitesRepo.create({ name: 'Balcony', icon: '🌿' });
    expect((await sitesRepo.listAll())).toHaveLength(1);
    await sitesRepo.rename(s.id, 'Patio', '🪴');
    expect((await sitesRepo.listAll())[0].name).toBe('Patio');
    await sitesRepo.delete(s.id);
    expect(await sitesRepo.listAll()).toHaveLength(0);
  });

  it('deleting a site nulls site_id on its pots', async () => {
    await speciesRepo.bulkUpsert([sampleSpecies()]);
    const s = await sitesRepo.create({ name: 'Kitchen', icon: '🍳' });
    const pot = { ...samplePot(), site_id: s.id };
    await potsRepo.create(pot, []);
    await sitesRepo.delete(s.id);
    const stored = await potsRepo.getById(pot.id);
    expect(stored?.site_id).toBeNull();
  });
});

describe('potsRepo cascade delete', () => {
  it('removes care_tasks, care_logs, journal_entries when pot is deleted', async () => {
    const sp = sampleSpecies();
    await speciesRepo.bulkUpsert([sp]);
    const pot = samplePot();
    const tasks = buildInitialTasks(pot, sp, newId);
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
      content: 'New leaf',
      photo_blob_ids: [],
      tags: ['new_growth'],
    });

    expect(await careTasksRepo.listByPot(pot.id)).toHaveLength(6);
    expect(await careLogsRepo.listByPot(pot.id)).toHaveLength(1);
    expect(await journalRepo.listByPot(pot.id)).toHaveLength(1);

    await potsRepo.delete(pot.id);

    expect(await potsRepo.getById(pot.id)).toBeUndefined();
    expect(await careTasksRepo.listByPot(pot.id)).toHaveLength(0);
    expect(await careLogsRepo.listByPot(pot.id)).toHaveLength(0);
    expect(await journalRepo.listByPot(pot.id)).toHaveLength(0);
  });

  it('listBySite(null) returns only pots without a site', async () => {
    await speciesRepo.bulkUpsert([sampleSpecies()]);
    const s = await sitesRepo.create({ name: 'Living Room', icon: '🛋️' });
    const a = { ...samplePot(), site_id: null };
    const b = { ...samplePot(), site_id: s.id };
    await potsRepo.create(a, []);
    await potsRepo.create(b, []);
    const homeless = await potsRepo.listBySite(null);
    expect(homeless.map((p) => p.id)).toEqual([a.id]);
    const inSite = await potsRepo.listBySite(s.id);
    expect(inSite.map((p) => p.id)).toEqual([b.id]);
  });
});

describe('careTasksRepo.listAllEnabledDueBy', () => {
  it('returns enabled tasks whose next_due_at <= ts', async () => {
    const sp = sampleSpecies();
    await speciesRepo.bulkUpsert([sp]);
    const pot = samplePot();
    const tasks = buildInitialTasks(pot, sp, newId).map((t, i) => ({
      ...t,
      next_due_at: Date.now() - (i % 2 === 0 ? 1000 : -1000),
      is_enabled: i !== 5,
    }));
    await potsRepo.create(pot, tasks);
    const due = await careTasksRepo.listAllEnabledDueBy(Date.now());
    // even indices (0,2,4) are due; index 4 is enabled, 5 is disabled
    expect(due).toHaveLength(3);
  });
});

describe('profileRepo singleton', () => {
  it('returns null on fresh db', async () => {
    expect(await profileRepo.get()).toBeNull();
  });

  it('upsert keeps only one row', async () => {
    const a: Profile = {
      id: newId(),
      display_name: 'Alex',
      avatar_blob_id: null,
      skill_level: 'beginner',
      notification_frequency: 'moderate',
      reminder_time: '08:00',
      created_at: Date.now(),
    };
    await profileRepo.upsert(a);
    const b: Profile = { ...a, id: newId(), display_name: 'Sam' };
    await profileRepo.upsert(b);
    const stored = await profileRepo.get();
    expect(stored?.display_name).toBe('Sam');
    const count = await db.profile.count();
    expect(count).toBe(1);
  });
});
