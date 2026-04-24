import { describe, expect, it } from 'vitest';
import { __csvTestHooks, toCareHistoryCSV } from '../csvExport';
import type {
  CareLog,
  PlantSpecies,
  Pot,
  UUID,
} from '../../../domain/types';

const pot: Pot = {
  id: 'pot-1',
  species_id: 'sp',
  display_name: 'Rose Pot 1',
  photo_blob_id: null,
  site_id: null,
  created_at: 0,
  notes: null,
  pot_size: 'm',
  pot_material: 'plastic',
  soil_type: 'standard',
  light_level: 'medium',
  location_type: 'indoor',
  use_custom_schedule: false,
  custom_schedule: null,
};

const species: PlantSpecies = {
  id: 'sp',
  common_name: 'Rose',
  scientific_name: 'Rosa',
  family: 'Rosaceae',
  description: '',
  image_url: null,
  difficulty: 'moderate',
  light_requirement: 'bright_indirect',
  toxicity: 'non_toxic',
  tags: [],
  care_defaults: {
    watering_interval_days: 7,
    fertilizing_interval_days: 14,
    misting_interval_days: 3,
    repotting_interval_days: 365,
    pruning_interval_days: 30,
    cleaning_interval_days: 30,
  },
};

const log = (overrides: Partial<CareLog>): CareLog => ({
  id: 'x',
  pot_id: 'pot-1',
  care_task_id: 't',
  action_type: 'watering',
  action: 'completed',
  performed_at: new Date(2026, 3, 14, 8, 30, 0).getTime(),
  notes: null,
  photo_blob_id: null,
  ...overrides,
});

function maps() {
  return {
    pots: new Map<UUID, Pot>([[pot.id, pot]]),
    species: new Map<UUID, PlantSpecies>([[species.id, species]]),
  };
}

describe('toCareHistoryCSV', () => {
  it('emits the header row + one row per log sorted by performed_at', () => {
    const logs = [
      log({ id: '2', performed_at: new Date(2026, 3, 15, 9, 0, 0).getTime() }),
      log({ id: '1', performed_at: new Date(2026, 3, 14, 8, 30, 0).getTime() }),
    ];
    const csv = toCareHistoryCSV(logs, maps().pots, maps().species);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe(__csvTestHooks.HEADER.join(','));
    expect(lines).toHaveLength(3);
    // first data row is the earliest log
    expect(lines[1].startsWith('2026-04-14,08:30')).toBe(true);
  });

  it('escapes cells containing comma, quote, or newline', () => {
    const csv = toCareHistoryCSV(
      [log({ notes: 'Fertilizer, "organic"\nBrand X' })],
      maps().pots,
      maps().species,
    );
    const body = csv.split('\r\n')[1];
    // the notes cell should be wrapped in double quotes with doubled internal quotes
    expect(body).toMatch(/"Fertilizer, ""organic""\nBrand X"/);
  });

  it('empty log list still emits a valid header', () => {
    const csv = toCareHistoryCSV([], maps().pots, maps().species);
    expect(csv).toBe(__csvTestHooks.HEADER.join(','));
  });

  it('missing pot/species leave fields blank', () => {
    const csv = toCareHistoryCSV(
      [log({ pot_id: 'ghost' })],
      new Map(),
      new Map(),
    );
    const cells = csv.split('\r\n')[1].split(',');
    // plant, species columns = indices 2 and 3 — blank
    expect(cells[2]).toBe('');
    expect(cells[3]).toBe('');
  });
});
