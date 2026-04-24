import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PlantaDB, __setDB } from '../../../data/db';
import {
  imagesRepo,
  journalRepo,
  potsRepo,
  speciesRepo,
} from '../../../data/repositories';
import { newId } from '../../../data/ids';
import { cleanupOrphanedImages, createEntry, deleteEntry } from '../actions';
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

const makePot = (photo: string | null = null): Pot => ({
  id: newId(),
  species_id: species.id,
  display_name: 'Pot',
  photo_blob_id: photo,
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
  db = new PlantaDB(`planta-journal-${++counter}`);
  __setDB(db);
  await speciesRepo.bulkUpsert([species]);
});

afterEach(async () => {
  await db.delete();
  __setDB(null);
});

describe('journal actions', () => {
  it('creates an entry with photos and tags', async () => {
    const pot = makePot();
    await potsRepo.create(pot, []);

    const blob1 = new Blob(['a'], { type: 'image/png' });
    const blob2 = new Blob(['b'], { type: 'image/png' });
    const id1 = await imagesRepo.put(blob1);
    const id2 = await imagesRepo.put(blob2);

    const entry = await createEntry({
      pot_id: pot.id,
      created_at: Date.now(),
      content: 'New leaf today!',
      photo_blob_ids: [id1, id2],
      tags: ['new_growth', 'blooming'],
    });

    const stored = await journalRepo.listByPot(pot.id);
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(entry.id);
    expect(stored[0].photo_blob_ids).toEqual([id1, id2]);
    expect(stored[0].tags).toEqual(['new_growth', 'blooming']);
  });

  it('deleteEntry removes the entry and cleans up its orphan images', async () => {
    const pot = makePot();
    await potsRepo.create(pot, []);
    const orphan = await imagesRepo.put(new Blob(['x']));
    const entry = await createEntry({
      pot_id: pot.id,
      created_at: Date.now(),
      content: 'x',
      photo_blob_ids: [orphan],
      tags: [],
    });

    await deleteEntry(entry.id, pot.id);

    expect(await journalRepo.listByPot(pot.id)).toHaveLength(0);
    expect(await imagesRepo.get(orphan)).toBeUndefined();
  });

  it('cleanupOrphanedImages keeps blobs still referenced by another entry', async () => {
    const pot = makePot();
    await potsRepo.create(pot, []);
    const shared = await imagesRepo.put(new Blob(['s']));
    await createEntry({
      pot_id: pot.id,
      created_at: Date.now(),
      content: 'a',
      photo_blob_ids: [shared],
      tags: [],
    });
    await createEntry({
      pot_id: pot.id,
      created_at: Date.now(),
      content: 'b',
      photo_blob_ids: [shared],
      tags: [],
    });

    await cleanupOrphanedImages([shared]);

    expect(await imagesRepo.get(shared)).toBeDefined();
  });

  it('cleanupOrphanedImages keeps blobs referenced by a pot photo', async () => {
    const photoId = await imagesRepo.put(new Blob(['p']));
    const pot = makePot(photoId);
    await potsRepo.create(pot, []);

    await cleanupOrphanedImages([photoId]);
    expect(await imagesRepo.get(photoId)).toBeDefined();
  });
});
