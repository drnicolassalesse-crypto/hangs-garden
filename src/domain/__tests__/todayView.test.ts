import { beforeAll, describe, expect, it } from 'vitest';
import { buildTodayView, dueLabel } from '../todayView';
import type {
  CareTask,
  PlantSpecies,
  Pot,
  Site,
  UUID,
} from '../types';
import { setLocale } from '../../i18n';

beforeAll(() => setLocale('en'));

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 3, 14, 12, 0, 0);

const pot = (overrides: Partial<Pot> = {}): Pot => ({
  id: 'pot-1',
  species_id: 'sp-1',
  display_name: 'P1',
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

const task = (overrides: Partial<CareTask>): CareTask => ({
  id: 't-1',
  pot_id: 'pot-1',
  action_type: 'watering',
  is_enabled: true,
  interval_days: 7,
  last_performed_at: null,
  next_due_at: NOW,
  snooze_until: null,
  notes: null,
  ...overrides,
});

const species: PlantSpecies = {
  id: 'sp-1',
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

function maps(pots: Pot[], sites: Site[] = []) {
  return {
    pots: new Map<UUID, Pot>(pots.map((p) => [p.id, p])),
    species: new Map<UUID, PlantSpecies>([[species.id, species]]),
    sites: new Map<UUID, Site>(sites.map((s) => [s.id, s])),
  };
}

describe('buildTodayView', () => {
  it('buckets tasks and sorts each section by due date', async () => {
    const p = pot();
    const tasks: CareTask[] = [
      task({ id: 't-overdue-1', next_due_at: NOW - 3 * DAY }),
      task({ id: 't-overdue-2', next_due_at: NOW - 1 * DAY }),
      task({ id: 't-today', next_due_at: NOW + 60 * 1000 }),
      task({ id: 't-upcoming-1', next_due_at: NOW + 2 * DAY }),
      task({ id: 't-upcoming-3', next_due_at: NOW + 3 * DAY }),
      task({ id: 't-later', next_due_at: NOW + 10 * DAY }),
    ];
    const view = buildTodayView({ tasks, ...maps([p]), now: NOW });
    expect(view.overdue.map((r) => r.task.id)).toEqual([
      't-overdue-1',
      't-overdue-2',
    ]);
    expect(view.today.map((r) => r.task.id)).toEqual(['t-today']);
    expect(view.upcoming.map((r) => r.task.id)).toEqual([
      't-upcoming-1',
      't-upcoming-3',
    ]);
    expect(view.totalVisible).toBe(5);
  });

  it('drops disabled tasks', () => {
    const p = pot();
    const tasks: CareTask[] = [
      task({ id: 'a', is_enabled: false }),
      task({ id: 'b', is_enabled: true }),
    ];
    const view = buildTodayView({ tasks, ...maps([p]), now: NOW });
    expect(view.today).toHaveLength(1);
    expect(view.today[0].task.id).toBe('b');
  });

  it('hides snoozed tasks', () => {
    const p = pot();
    const tasks: CareTask[] = [
      task({
        id: 'a',
        next_due_at: NOW - 5 * DAY, // would be overdue
        snooze_until: NOW + 2 * DAY,
      }),
    ];
    const view = buildTodayView({ tasks, ...maps([p]), now: NOW });
    expect(view.totalVisible).toBe(0);
  });

  it('applies action and site filters', () => {
    const site: Site = {
      id: 'site-1',
      name: 'Balcony',
      icon: '🌿',
      created_at: 0,
    };
    const p1 = pot({ id: 'pot-1', site_id: 'site-1' });
    const p2 = pot({ id: 'pot-2', site_id: null });
    const tasks: CareTask[] = [
      task({ id: 'water-p1', pot_id: 'pot-1', action_type: 'watering' }),
      task({ id: 'fert-p1', pot_id: 'pot-1', action_type: 'fertilizing' }),
      task({ id: 'water-p2', pot_id: 'pot-2', action_type: 'watering' }),
    ];
    const all = buildTodayView({
      tasks,
      ...maps([p1, p2], [site]),
      now: NOW,
    });
    expect(all.totalVisible).toBe(3);

    const onlyWater = buildTodayView({
      tasks,
      ...maps([p1, p2], [site]),
      now: NOW,
      actionFilter: 'watering',
    });
    expect(onlyWater.totalVisible).toBe(2);

    const onlyBalcony = buildTodayView({
      tasks,
      ...maps([p1, p2], [site]),
      now: NOW,
      siteFilter: 'site-1',
    });
    expect(onlyBalcony.totalVisible).toBe(2);
  });
});

describe('dueLabel', () => {
  const p = pot();
  void p;
  it('Today', () => {
    expect(dueLabel(task({ next_due_at: NOW + 60 * 1000 }), NOW)).toBe('Today');
  });
  it('overdue singular', () => {
    expect(dueLabel(task({ next_due_at: NOW - DAY }), NOW)).toBe(
      '1 day overdue',
    );
  });
  it('overdue plural', () => {
    expect(dueLabel(task({ next_due_at: NOW - 3 * DAY }), NOW)).toBe(
      '3 days overdue',
    );
  });
  it('upcoming singular', () => {
    expect(dueLabel(task({ next_due_at: NOW + DAY }), NOW)).toBe('in 1 day');
  });
  it('upcoming plural', () => {
    expect(dueLabel(task({ next_due_at: NOW + 3 * DAY }), NOW)).toBe(
      'in 3 days',
    );
  });
});
