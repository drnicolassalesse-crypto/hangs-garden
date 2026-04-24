import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PlantaDB, __setDB } from '../../../data/db';
import { speciesRepo } from '../../../data/repositories';
import {
  createCustomSpecies,
  deleteCustomSpecies,
  updateCustomSpecies,
} from '../speciesActions';
import type { PlantSpecies } from '../../../domain/types';

const bundled: PlantSpecies = {
  id: 'bundled-1',
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
  // is_custom omitted → treated as bundled
};

let db: PlantaDB;
let counter = 0;

beforeEach(async () => {
  db = new PlantaDB(`planta-custom-species-${++counter}`);
  __setDB(db);
  await speciesRepo.bulkUpsert([bundled]);
});

afterEach(async () => {
  await db.delete();
  __setDB(null);
});

describe('custom species actions', () => {
  it('createCustomSpecies persists a record with is_custom=true and a vi_name tag', async () => {
    const created = await createCustomSpecies({
      common_name: 'Taro',
      vi_name: 'Khoai môn',
      difficulty: 'moderate',
      light_requirement: 'bright_indirect',
      toxicity: 'toxic_to_pets',
      care_defaults: {
        watering_interval_days: 4,
        fertilizing_interval_days: 21,
        misting_interval_days: 7,
        repotting_interval_days: 365,
        pruning_interval_days: 90,
        cleaning_interval_days: 60,
      },
    });
    expect(created.is_custom).toBe(true);
    expect(created.tags).toContain('vi_name:Khoai môn');
    const loaded = await speciesRepo.getById(created.id);
    expect(loaded?.common_name).toBe('Taro');
  });

  it('updateCustomSpecies changes a custom species', async () => {
    const created = await createCustomSpecies({
      common_name: 'Taro',
      difficulty: 'moderate',
      light_requirement: 'bright_indirect',
      toxicity: 'non_toxic',
      care_defaults: bundled.care_defaults,
    });
    await updateCustomSpecies(created.id, {
      common_name: 'Taro edited',
      vi_name: 'Khoai môn',
      difficulty: 'hard',
      light_requirement: 'direct',
      toxicity: 'toxic_to_pets',
      care_defaults: bundled.care_defaults,
    });
    const loaded = await speciesRepo.getById(created.id);
    expect(loaded?.common_name).toBe('Taro edited');
    expect(loaded?.difficulty).toBe('hard');
    expect(loaded?.tags).toContain('vi_name:Khoai môn');
    expect(loaded?.is_custom).toBe(true);
  });

  it('updateCustomSpecies refuses to mutate a bundled species', async () => {
    await expect(
      updateCustomSpecies(bundled.id, {
        common_name: 'Hacked',
        difficulty: 'easy',
        light_requirement: 'low',
        toxicity: 'non_toxic',
        care_defaults: bundled.care_defaults,
      }),
    ).rejects.toThrow(/bundled/);
  });

  it('deleteCustomSpecies removes the row but refuses bundled deletes', async () => {
    const created = await createCustomSpecies({
      common_name: 'Temp',
      difficulty: 'easy',
      light_requirement: 'medium',
      toxicity: 'non_toxic',
      care_defaults: bundled.care_defaults,
    });
    await deleteCustomSpecies(created.id);
    expect(await speciesRepo.getById(created.id)).toBeUndefined();

    await expect(deleteCustomSpecies(bundled.id)).rejects.toThrow(
      /bundled/,
    );
  });

  it('a re-seed that upserts bundled rows leaves custom species intact', async () => {
    const created = await createCustomSpecies({
      common_name: 'Kept',
      difficulty: 'easy',
      light_requirement: 'medium',
      toxicity: 'non_toxic',
      care_defaults: bundled.care_defaults,
    });

    // Simulate a bundled re-upsert (what the seeder does on a version bump)
    await speciesRepo.bulkUpsert([
      { ...bundled, description: 'updated description' },
    ]);

    const rebundled = await speciesRepo.getById(bundled.id);
    expect(rebundled?.description).toBe('updated description');
    const stillCustom = await speciesRepo.getById(created.id);
    expect(stillCustom).toBeDefined();
    expect(stillCustom?.common_name).toBe('Kept');
    expect(stillCustom?.is_custom).toBe(true);
  });
});
