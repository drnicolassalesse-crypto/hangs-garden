import {
  imagesRepo,
  journalRepo,
  potsRepo,
} from '../../data/repositories';
import { newId } from '../../data/ids';
import type { JournalEntry, UUID } from '../../domain/types';

export interface CreateEntryInput {
  pot_id: UUID;
  created_at: number;
  content: string;
  photo_blob_ids: UUID[];
  tags: string[];
}

export async function createEntry(
  input: CreateEntryInput,
): Promise<JournalEntry> {
  const entry: JournalEntry = {
    id: newId(),
    pot_id: input.pot_id,
    created_at: input.created_at,
    content: input.content.trim(),
    photo_blob_ids: input.photo_blob_ids,
    tags: input.tags,
  };
  await journalRepo.create(entry);
  return entry;
}

export async function deleteEntry(
  entryId: UUID,
  potId: UUID,
): Promise<void> {
  const all = await journalRepo.listByPot(potId);
  const target = all.find((e) => e.id === entryId);
  await journalRepo.delete(entryId);
  if (target) {
    await cleanupOrphanedImages(target.photo_blob_ids);
  }
}

/**
 * Delete image blobs that aren't referenced by any pot photo or any
 * (remaining) journal entry. Only two tables reference image ids in this
 * schema: pots.photo_blob_id and journal_entries.photo_blob_ids.
 */
export async function cleanupOrphanedImages(
  candidateBlobIds: UUID[],
): Promise<void> {
  if (candidateBlobIds.length === 0) return;
  const pots = await potsRepo.listAll();
  const potBlobs = new Set(
    pots.map((p) => p.photo_blob_id).filter((x): x is UUID => !!x),
  );
  // Collect all blob ids still referenced by any journal entry. OK for MVP
  // scale (tens to low hundreds of entries per user).
  const referenced = new Set<UUID>(potBlobs);
  for (const p of pots) {
    const entries = await (
      await import('../../data/repositories')
    ).journalRepo.listByPot(p.id);
    for (const e of entries) {
      for (const id of e.photo_blob_ids) referenced.add(id);
    }
  }
  for (const id of candidateBlobIds) {
    if (!referenced.has(id)) {
      try {
        await imagesRepo.delete(id);
      } catch {
        // ignore — blob may already be gone
      }
    }
  }
}
