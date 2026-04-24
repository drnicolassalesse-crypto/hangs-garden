import { describe, expect, it } from 'vitest';
import {
  matchesSearch,
  nextDueLabel,
  sortSummaries,
  summarizePlants,
  type PlantSummary,
} from '../plantSummary';
import type {
  CareTask,
  PlantSpecies,
  Pot,
  Site,
  UUID,
} from '../types';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 3, 14, 12, 0, 0);

const species = (overrides: Partial<PlantSpecies> = {}): PlantSpecies => ({
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
  ...overrides,
});

const pot = (overrides: Partial<Pot> = {}): Pot => ({
  id: 'p1',
  species_id: 'sp',
  display_name: 'Pot 1',
  photo_blob_id: null,
  site_id: null,
  created_at: NOW - 30 * DAY,
  notes: null,
  pot_size: 'm',
  pot_material: 'plastic',
  soil_type: 'standard',
  light_level: 'medium',
  location_type: 'indoor',
  use_custom_schedule: false,
  custom_schedule: null,
  ...overrides,
});

const task = (overrides: Partial<CareTask> = {}): CareTask => ({
  id: 't',
  pot_id: 'p1',
  action_type: 'watering',
  is_enabled: true,
  interval_days: 7,
  last_performed_at: null,
  next_due_at: NOW,
  snooze_until: null,
  notes: null,
  ...overrides,
});

function maps(s: PlantSpecies[], si: Site[] = []) {
  return {
    species: new Map<UUID, PlantSpecies>(s.map((x) => [x.id, x])),
    sites: new Map<UUID, Site>(si.map((x) => [x.id, x])),
  };
}

describe('summarizePlants', () => {
  it('picks the earliest enabled task as next due', () => {
    const p = pot();
    const tasks: CareTask[] = [
      task({ id: 'a', action_type: 'watering', next_due_at: NOW + 5 * DAY }),
      task({ id: 'b', action_type: 'fertilizing', next_due_at: NOW + 1 * DAY }),
      task({ id: 'c', action_type: 'misting', next_due_at: NOW + 3 * DAY }),
    ];
    const [sum] = summarizePlants({
      pots: [p],
      tasks,
      ...maps([species()]),
      now: NOW,
    });
    expect(sum.nextDueTask?.id).toBe('b');
    expect(sum.nextDueInDays).toBe(1);
    expect(sum.anyOverdue).toBe(false);
  });

  it('ignores disabled tasks and snoozed tasks', () => {
    const p = pot();
    const tasks: CareTask[] = [
      task({
        id: 'a',
        is_enabled: false,
        next_due_at: NOW - 10 * DAY, // would-be overdue
      }),
      task({
        id: 'b',
        next_due_at: NOW - 5 * DAY,
        snooze_until: NOW + 2 * DAY,
      }),
      task({ id: 'c', next_due_at: NOW + 3 * DAY }),
    ];
    const [sum] = summarizePlants({
      pots: [p],
      tasks,
      ...maps([species()]),
      now: NOW,
    });
    expect(sum.nextDueTask?.id).toBe('c');
    expect(sum.anyOverdue).toBe(false);
  });

  it('flags anyOverdue when an enabled, non-snoozed task is in the past', () => {
    const p = pot();
    const tasks: CareTask[] = [
      task({ id: 'a', next_due_at: NOW - 2 * DAY }),
      task({ id: 'b', next_due_at: NOW + 3 * DAY }),
    ];
    const [sum] = summarizePlants({
      pots: [p],
      tasks,
      ...maps([species()]),
      now: NOW,
    });
    expect(sum.anyOverdue).toBe(true);
  });
});

describe('matchesSearch', () => {
  const sum: PlantSummary = {
    pot: pot({ display_name: 'Kitchen Coriander' }),
    species: species({
      common_name: 'Vietnamese Coriander',
      tags: ['vi_name:Rau răm', 'herb'],
    }),
    site: null,
    nextDueTask: null,
    nextDueInDays: null,
    anyOverdue: false,
  };

  it('matches English common name', () => {
    expect(matchesSearch(sum, 'viet')).toBe(true);
  });

  it('matches pot display name', () => {
    expect(matchesSearch(sum, 'kitchen')).toBe(true);
  });

  it('matches Vietnamese name from vi_name tag', () => {
    expect(matchesSearch(sum, 'rau')).toBe(true);
    expect(matchesSearch(sum, 'răm')).toBe(true);
  });

  it('empty search matches all', () => {
    expect(matchesSearch(sum, '')).toBe(true);
  });

  it('no match returns false', () => {
    expect(matchesSearch(sum, 'zzz')).toBe(false);
  });
});

describe('sortSummaries', () => {
  const s1: PlantSummary = {
    pot: pot({ id: 'a', display_name: 'Basil' }),
    species: species(),
    site: { id: 'site-kitchen', name: 'Kitchen', icon: '🍳', created_at: 0 },
    nextDueTask: task({ next_due_at: NOW + 2 * DAY }),
    nextDueInDays: 2,
    anyOverdue: false,
  };
  const s2: PlantSummary = {
    pot: pot({ id: 'b', display_name: 'Aloe' }),
    species: species(),
    site: { id: 'site-balcony', name: 'Balcony', icon: '🌿', created_at: 0 },
    nextDueTask: task({ next_due_at: NOW + 5 * DAY }),
    nextDueInDays: 5,
    anyOverdue: false,
  };
  const s3: PlantSummary = {
    pot: pot({ id: 'c', display_name: 'Mint' }),
    species: species(),
    site: null,
    nextDueTask: task({ next_due_at: NOW + 1 * DAY }),
    nextDueInDays: 1,
    anyOverdue: false,
  };

  it('sorts by name alphabetically', () => {
    const out = sortSummaries([s1, s2, s3], 'name');
    expect(out.map((s) => s.pot.display_name)).toEqual([
      'Aloe',
      'Basil',
      'Mint',
    ]);
  });

  it('sorts by next_due ascending', () => {
    const out = sortSummaries([s1, s2, s3], 'next_due');
    expect(out.map((s) => s.pot.display_name)).toEqual([
      'Mint',
      'Basil',
      'Aloe',
    ]);
  });

  it('sorts by site, then name; no-site last', () => {
    const out = sortSummaries([s1, s2, s3], 'site');
    expect(out.map((s) => s.pot.display_name)).toEqual([
      'Aloe', // Balcony
      'Basil', // Kitchen
      'Mint', // no site
    ]);
  });
});

describe('nextDueLabel', () => {
  const base: PlantSummary = {
    pot: pot(),
    species: species(),
    site: null,
    nextDueTask: task(),
    nextDueInDays: 0,
    anyOverdue: false,
  };
  it('Today', () => expect(nextDueLabel({ ...base, nextDueInDays: 0 })).toBe('Today'));
  it('overdue', () =>
    expect(nextDueLabel({ ...base, nextDueInDays: -3 })).toBe('3 days overdue'));
  it('upcoming', () =>
    expect(nextDueLabel({ ...base, nextDueInDays: 2 })).toBe('in 2 days'));
  it('no tasks', () =>
    expect(
      nextDueLabel({ ...base, nextDueTask: null, nextDueInDays: null }),
    ).toBe('No tasks'));
});
