import seedData from './species/seed.json';
import { speciesRepo } from './repositories';
import type { PlantSpecies } from '../domain/types';

interface SeedFile {
  version: number;
  locale_focus: string;
  species: PlantSpecies[];
}

const SEED: SeedFile = seedData as SeedFile;
const SEED_VERSION_KEY = 'planta.seed.version';

export async function seedIfNeeded(): Promise<{
  inserted: number;
  total: number;
}> {
  const existing = await speciesRepo.count();
  const storedVersion = Number(localStorage.getItem(SEED_VERSION_KEY) ?? '0');

  // Version-only gate — custom species (different UUID ids) are not affected
  // by bulkPut of bundled ids, so we just skip work when already synced.
  if (storedVersion === SEED.version && existing >= SEED.species.length) {
    return { inserted: 0, total: existing };
  }

  await speciesRepo.bulkUpsert(SEED.species);
  localStorage.setItem(SEED_VERSION_KEY, String(SEED.version));
  const total = await speciesRepo.count();
  return { inserted: total - existing, total };
}

export const __seedTestHooks = { SEED, SEED_VERSION_KEY };
