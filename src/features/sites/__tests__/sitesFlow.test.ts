import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PlantaDB, __setDB } from '../../../data/db';
import {
  potsRepo,
  sitesRepo,
  speciesRepo,
} from '../../../data/repositories';
import { newId } from '../../../data/ids';
import { buildInitialTasks } from '../../../domain/schedule';
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

const makePot = (site_id: string | null): Pot => ({
  id: newId(),
  species_id: species.id,
  display_name: 'Pot',
  photo_blob_id: null,
  site_id,
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
  db = new PlantaDB(`planta-sites-flow-${++counter}`);
  __setDB(db);
  await speciesRepo.bulkUpsert([species]);
});

afterEach(async () => {
  await db.delete();
  __setDB(null);
});

describe('Sites flow', () => {
  it('creates a site, assigns a pot, renames, then deletes — pot survives with site_id null', async () => {
    const site = await sitesRepo.create({ name: 'Balcony', icon: '🌿' });

    const pot = makePot(site.id);
    await potsRepo.create(pot, buildInitialTasks(pot, species, newId));

    // pot is correctly listed under the site
    const inSite = await potsRepo.listBySite(site.id);
    expect(inSite.map((p) => p.id)).toEqual([pot.id]);

    await sitesRepo.rename(site.id, 'Front balcony', '🪴');
    const sites = await sitesRepo.listAll();
    expect(sites[0].name).toBe('Front balcony');
    expect(sites[0].icon).toBe('🪴');

    await sitesRepo.delete(site.id);

    expect(await sitesRepo.listAll()).toHaveLength(0);
    const reloadedPot = await potsRepo.getById(pot.id);
    expect(reloadedPot).toBeDefined();
    expect(reloadedPot?.site_id).toBeNull();
  });

  it('multiple sites + listBySite(null) returns only homeless pots', async () => {
    const a = await sitesRepo.create({ name: 'Kitchen', icon: '🍳' });
    const potA = makePot(a.id);
    const potNone = makePot(null);
    await potsRepo.create(potA, []);
    await potsRepo.create(potNone, []);

    expect((await potsRepo.listBySite(a.id)).map((p) => p.id)).toEqual([
      potA.id,
    ]);
    expect((await potsRepo.listBySite(null)).map((p) => p.id)).toEqual([
      potNone.id,
    ]);
  });

  it('site creation is reflected in subsequent listAll', async () => {
    const a = await sitesRepo.create({ name: 'A', icon: '🌿' });
    const b = await sitesRepo.create({ name: 'B', icon: '🪴' });
    const all = await sitesRepo.listAll();
    expect(all.map((s) => s.id)).toEqual([a.id, b.id]);
  });
});
