import { getDB } from '../db';
import type { PlantSpecies, UUID } from '../../domain/types';

export const speciesRepo = {
  listAll(): Promise<PlantSpecies[]> {
    return getDB().plant_species.orderBy('common_name').toArray();
  },
  getById(id: UUID): Promise<PlantSpecies | undefined> {
    return getDB().plant_species.get(id);
  },
  bulkUpsert(records: PlantSpecies[]): Promise<unknown> {
    return getDB().plant_species.bulkPut(records);
  },
  count(): Promise<number> {
    return getDB().plant_species.count();
  },
};
