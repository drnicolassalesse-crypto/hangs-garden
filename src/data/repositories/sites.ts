import { getDB } from '../db';
import { newId } from '../ids';
import type { GardenLayout, Site, UUID } from '../../domain/types';

export const sitesRepo = {
  listAll(): Promise<Site[]> {
    return getDB().sites.orderBy('created_at').toArray();
  },
  async create(input: { name: string; icon: string }): Promise<Site> {
    const site: Site = {
      id: newId(),
      name: input.name,
      icon: input.icon,
      created_at: Date.now(),
    };
    await getDB().sites.add(site);
    return site;
  },
  async rename(id: UUID, name: string, icon: string): Promise<void> {
    await getDB().sites.update(id, { name, icon });
  },
  async delete(id: UUID): Promise<void> {
    const db = getDB();
    await db.transaction('rw', db.sites, db.pots, async () => {
      await db.pots.where('site_id').equals(id).modify({ site_id: null });
      await db.sites.delete(id);
    });
  },
  async saveLayout(id: UUID, layout: GardenLayout): Promise<void> {
    await getDB().sites.update(id, { layout });
  },
  async clearLayout(id: UUID): Promise<void> {
    await getDB().sites.update(id, { layout: null });
  },
};
