import { getDB } from '../db';
import { newId } from '../ids';
import { imagesRepo } from './images';
import type { Fertilizer, FertilizerType, UUID } from '../../domain/types';

export interface FertilizerInput {
  name: string;
  type: FertilizerType;
  npk: string | null;
  notes: string | null;
  photo_blob_id: UUID | null;
}

export const fertilizersRepo = {
  listAll(): Promise<Fertilizer[]> {
    return getDB().fertilizers.orderBy('name').toArray();
  },
  getById(id: UUID): Promise<Fertilizer | undefined> {
    return getDB().fertilizers.get(id);
  },
  async create(input: FertilizerInput): Promise<Fertilizer> {
    const record: Fertilizer = {
      id: newId(),
      name: input.name.trim(),
      type: input.type,
      npk: input.npk?.trim() ? input.npk.trim() : null,
      notes: input.notes?.trim() ? input.notes.trim() : null,
      photo_blob_id: input.photo_blob_id,
      created_at: Date.now(),
    };
    await getDB().fertilizers.add(record);
    return record;
  },
  async update(id: UUID, input: FertilizerInput): Promise<void> {
    const existing = await getDB().fertilizers.get(id);
    if (!existing) return;
    const next: Fertilizer = {
      ...existing,
      name: input.name.trim(),
      type: input.type,
      npk: input.npk?.trim() ? input.npk.trim() : null,
      notes: input.notes?.trim() ? input.notes.trim() : null,
      photo_blob_id: input.photo_blob_id,
    };
    await getDB().fertilizers.put(next);
    // Clean up previous photo if replaced.
    if (
      existing.photo_blob_id &&
      existing.photo_blob_id !== input.photo_blob_id
    ) {
      try {
        await imagesRepo.delete(existing.photo_blob_id);
      } catch {
        /* ignore */
      }
    }
  },
  async delete(id: UUID): Promise<void> {
    const existing = await getDB().fertilizers.get(id);
    if (!existing) return;
    await getDB().fertilizers.delete(id);
    if (existing.photo_blob_id) {
      try {
        await imagesRepo.delete(existing.photo_blob_id);
      } catch {
        /* ignore */
      }
    }
  },
};
