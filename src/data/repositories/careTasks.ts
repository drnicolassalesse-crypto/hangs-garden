import { getDB } from '../db';
import type { CareTask, UUID } from '../../domain/types';

export const careTasksRepo = {
  listByPot(potId: UUID): Promise<CareTask[]> {
    return getDB().care_tasks.where('pot_id').equals(potId).toArray();
  },
  getById(id: UUID): Promise<CareTask | undefined> {
    return getDB().care_tasks.get(id);
  },
  listAllEnabledDueBy(ts: number): Promise<CareTask[]> {
    return getDB()
      .care_tasks.where('next_due_at')
      .belowOrEqual(ts)
      .filter((t) => t.is_enabled)
      .toArray();
  },
  listAllEnabled(): Promise<CareTask[]> {
    return getDB()
      .care_tasks.filter((t) => t.is_enabled)
      .toArray();
  },
  async update(task: CareTask): Promise<void> {
    await getDB().care_tasks.put(task);
  },
  async replaceForPot(potId: UUID, tasks: CareTask[]): Promise<void> {
    const db = getDB();
    await db.transaction('rw', db.care_tasks, async () => {
      await db.care_tasks.where('pot_id').equals(potId).delete();
      await db.care_tasks.bulkAdd(tasks);
    });
  },
};
