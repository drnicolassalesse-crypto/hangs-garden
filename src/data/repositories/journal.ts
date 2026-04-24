import { getDB } from '../db';
import type { JournalEntry, UUID } from '../../domain/types';

export const journalRepo = {
  listByPot(potId: UUID): Promise<JournalEntry[]> {
    return getDB()
      .journal_entries.where('pot_id')
      .equals(potId)
      .reverse()
      .sortBy('created_at');
  },
  async create(entry: JournalEntry): Promise<void> {
    await getDB().journal_entries.add(entry);
  },
  async update(entry: JournalEntry): Promise<void> {
    await getDB().journal_entries.put(entry);
  },
  async delete(id: UUID): Promise<void> {
    await getDB().journal_entries.delete(id);
  },
};
