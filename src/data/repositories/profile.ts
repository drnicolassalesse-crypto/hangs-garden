import { getDB } from '../db';
import type { Profile } from '../../domain/types';

export const profileRepo = {
  async get(): Promise<Profile | null> {
    const all = await getDB().profile.toArray();
    return all[0] ?? null;
  },
  async upsert(profile: Profile): Promise<void> {
    const db = getDB();
    await db.transaction('rw', db.profile, async () => {
      // Single-row table: ensure no stale rows linger.
      await db.profile.clear();
      await db.profile.add(profile);
    });
  },
  async clear(): Promise<void> {
    await getDB().profile.clear();
  },
};
