import { getDB } from '../db';
import { newId } from '../ids';
import type { CareLog, UUID } from '../../domain/types';

export const careLogsRepo = {
  async appendMany(entries: Omit<CareLog, 'id'>[]): Promise<CareLog[]> {
    const withIds: CareLog[] = entries.map((e) => ({ ...e, id: newId() }));
    await getDB().care_logs.bulkAdd(withIds);
    return withIds;
  },
  listByPot(potId: UUID): Promise<CareLog[]> {
    return getDB()
      .care_logs.where('pot_id')
      .equals(potId)
      .reverse()
      .sortBy('performed_at');
  },
  listByTask(taskId: UUID): Promise<CareLog[]> {
    return getDB()
      .care_logs.where('care_task_id')
      .equals(taskId)
      .reverse()
      .sortBy('performed_at');
  },
  listAllForExport(): Promise<CareLog[]> {
    return getDB().care_logs.orderBy('performed_at').toArray();
  },
};
