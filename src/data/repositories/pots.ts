import { getDB } from '../db';
import type { CareTask, Pot, UUID } from '../../domain/types';

export const potsRepo = {
  listAll(): Promise<Pot[]> {
    return getDB().pots.orderBy('created_at').reverse().toArray();
  },
  getById(id: UUID): Promise<Pot | undefined> {
    return getDB().pots.get(id);
  },
  async listBySite(siteId: UUID | null): Promise<Pot[]> {
    const db = getDB();
    if (siteId === null) {
      const all = await db.pots.toArray();
      return all.filter((p) => p.site_id === null);
    }
    return db.pots.where('site_id').equals(siteId).toArray();
  },
  async create(pot: Pot, tasks: CareTask[]): Promise<void> {
    const db = getDB();
    await db.transaction('rw', db.pots, db.care_tasks, async () => {
      await db.pots.add(pot);
      await db.care_tasks.bulkAdd(tasks);
    });
  },
  async update(pot: Pot): Promise<void> {
    await getDB().pots.put(pot);
  },
  async delete(id: UUID): Promise<void> {
    const db = getDB();
    await db.transaction(
      'rw',
      db.pots,
      db.care_tasks,
      db.care_logs,
      db.journal_entries,
      async () => {
        await db.care_tasks.where('pot_id').equals(id).delete();
        await db.care_logs.where('pot_id').equals(id).delete();
        await db.journal_entries.where('pot_id').equals(id).delete();
        await db.pots.delete(id);
      },
    );
  },
};
