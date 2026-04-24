import Dexie, { type Table } from 'dexie';
import type {
  CareLog,
  CareTask,
  Fertilizer,
  JournalEntry,
  PlantSpecies,
  Pot,
  Profile,
  Site,
  UUID,
} from '../domain/types';

export interface ImageRow {
  id: UUID;
  blob: Blob;
  created_at: number;
}

export class PlantaDB extends Dexie {
  plant_species!: Table<PlantSpecies, UUID>;
  sites!: Table<Site, UUID>;
  pots!: Table<Pot, UUID>;
  care_tasks!: Table<CareTask, UUID>;
  care_logs!: Table<CareLog, UUID>;
  journal_entries!: Table<JournalEntry, UUID>;
  images!: Table<ImageRow, UUID>;
  profile!: Table<Profile, UUID>;
  fertilizers!: Table<Fertilizer, UUID>;

  constructor(name = 'planta') {
    super(name);
    this.version(1).stores({
      plant_species: 'id, common_name, family',
      sites: 'id, created_at',
      pots: 'id, species_id, site_id, created_at',
      care_tasks: 'id, pot_id, [pot_id+action_type], next_due_at, is_enabled',
      care_logs: 'id, pot_id, care_task_id, performed_at',
      journal_entries: 'id, pot_id, created_at',
      images: 'id',
      profile: 'id',
    });
    this.version(2).stores({
      fertilizers: 'id, created_at, name',
    });
  }
}

let _db: PlantaDB | null = null;

export function getDB(): PlantaDB {
  if (!_db) _db = new PlantaDB();
  return _db;
}

// Test seam: lets tests inject a fresh in-memory Dexie wired to fake-indexeddb.
export function __setDB(db: PlantaDB | null) {
  _db = db;
}
