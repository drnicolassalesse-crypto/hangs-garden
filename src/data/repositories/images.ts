import { getDB } from '../db';
import { newId } from '../ids';
import type { UUID } from '../../domain/types';

const urlCache = new Map<UUID, string>();

export const imagesRepo = {
  async put(blob: Blob): Promise<UUID> {
    const id = newId();
    await getDB().images.add({ id, blob, created_at: Date.now() });
    return id;
  },
  async get(id: UUID): Promise<Blob | undefined> {
    const row = await getDB().images.get(id);
    return row?.blob;
  },
  async delete(id: UUID): Promise<void> {
    const cached = urlCache.get(id);
    if (cached) {
      URL.revokeObjectURL(cached);
      urlCache.delete(id);
    }
    await getDB().images.delete(id);
  },
  async objectUrl(id: UUID): Promise<string | null> {
    const cached = urlCache.get(id);
    if (cached) return cached;
    const blob = await this.get(id);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    urlCache.set(id, url);
    return url;
  },
  releaseAllUrls(): void {
    for (const url of urlCache.values()) URL.revokeObjectURL(url);
    urlCache.clear();
  },
  // Re-exported for convenience when the caller already has an id ready.
  newId,
};
