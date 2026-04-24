import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PlantaDB, __setDB } from '../db';
import { seedIfNeeded, __seedTestHooks } from '../seeders';
import { speciesRepo } from '../repositories';

// Minimal localStorage shim for node environment.
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

let db: PlantaDB;
let dbCounter = 0;

beforeEach(() => {
  if (typeof globalThis.localStorage === 'undefined') {
    Object.defineProperty(globalThis, 'localStorage', {
      value: new MemoryStorage(),
      writable: true,
    });
  } else {
    globalThis.localStorage.clear();
  }
  db = new PlantaDB(`planta-seed-test-${++dbCounter}`);
  __setDB(db);
});

afterEach(async () => {
  await db.delete();
  __setDB(null);
});

describe('seedIfNeeded', () => {
  it('inserts all bundled species on first launch', async () => {
    const expected = __seedTestHooks.SEED.species.length;
    expect(expected).toBeGreaterThanOrEqual(30);

    const result = await seedIfNeeded();
    expect(result.inserted).toBe(expected);
    expect(result.total).toBe(expected);
    expect(await speciesRepo.count()).toBe(expected);
  });

  it('is a no-op on second launch', async () => {
    await seedIfNeeded();
    const second = await seedIfNeeded();
    expect(second.inserted).toBe(0);
    expect(second.total).toBe(__seedTestHooks.SEED.species.length);
  });

  it('re-merges when SEED_VERSION changes', async () => {
    await seedIfNeeded();
    // Simulate an older stored version → forces a re-merge (no row count change but version updates)
    localStorage.setItem(__seedTestHooks.SEED_VERSION_KEY, '0');
    // also drop one row to simulate it having been pruned manually
    const first = (await speciesRepo.listAll())[0];
    await db.plant_species.delete(first.id);

    const result = await seedIfNeeded();
    expect(result.total).toBe(__seedTestHooks.SEED.species.length);
  });

  it('Vietnam-curated content sanity check', async () => {
    await seedIfNeeded();
    const all = await speciesRepo.listAll();
    const ids = new Set(all.map((s) => s.id));
    // Tết flowers
    expect(ids.has('mai-vang')).toBe(true);
    expect(ids.has('peach-blossom')).toBe(true);
    expect(ids.has('kumquat')).toBe(true);
    // Vietnamese culinary herbs
    expect(ids.has('lemongrass')).toBe(true);
    expect(ids.has('vietnamese-coriander')).toBe(true);
    expect(ids.has('perilla')).toBe(true);
    // Every record carries a Vietnamese name tag
    for (const s of all) {
      expect(s.tags.some((t) => t.startsWith('vi_name:'))).toBe(true);
    }
  });
});
