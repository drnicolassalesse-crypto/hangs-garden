import { describe, expect, it } from 'vitest';
import {
  applyComplete,
  applySkip,
  applySnooze,
  bucketTask,
  buildInitialTasks,
  computeCalculatedInterval,
  computeNextDueAt,
  computeWateringInterval,
  effectiveInterval,
  recalculateTasks,
} from '../schedule';
import type {
  CareTask,
  CustomSchedule,
  LightLevel,
  LocationType,
  PlantSpecies,
  Pot,
  PotMaterial,
  PotSize,
  SoilType,
} from '../types';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 3, 13, 12, 0, 0); // 2026-04-13T12:00:00Z

const baselineSpecies = (overrides: Partial<PlantSpecies> = {}): PlantSpecies => ({
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
    watering_interval_days: 10,
    fertilizing_interval_days: 14,
    misting_interval_days: 3,
    repotting_interval_days: 365,
    pruning_interval_days: 30,
    cleaning_interval_days: 30,
  },
  ...overrides,
});

const baselinePot = (overrides: Partial<Pot> = {}): Pot => ({
  id: 'pot-1',
  species_id: 'sp-1',
  display_name: 'Rose Pot 1',
  photo_blob_id: null,
  site_id: null,
  created_at: NOW,
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

const baselineTask = (overrides: Partial<CareTask> = {}): CareTask => ({
  id: 't-1',
  pot_id: 'pot-1',
  action_type: 'watering',
  is_enabled: true,
  interval_days: 10,
  last_performed_at: null,
  next_due_at: NOW + 10 * DAY,
  snooze_until: null,
  notes: null,
  ...overrides,
});

describe('computeWateringInterval — multipliers (§4.2)', () => {
  const base = 10;
  const f = {
    pot_size: 'm' as PotSize,
    pot_material: 'plastic' as PotMaterial,
    soil_type: 'standard' as SoilType,
    light_level: 'medium' as LightLevel,
    location_type: 'indoor' as LocationType,
  };

  it('returns base interval for all-baseline factors', () => {
    expect(computeWateringInterval(base, f)).toBe(10);
  });

  it.each([
    ['xs', 6],
    ['s', 8],
    ['m', 10],
    ['l', 13],
    ['xl', 16],
  ] as const)('pot_size %s → %d', (size, expected) => {
    expect(computeWateringInterval(base, { ...f, pot_size: size })).toBe(
      expected,
    );
  });

  it.each([
    ['terracotta', 7],
    ['fabric', 8], // 10*0.75 = 7.5 → 8
    ['wood', 9], // 10*0.85 = 8.5 → 9
    ['plastic', 10],
    ['metal', 10],
    ['ceramic', 11],
    ['glass', 12], // 10*1.15 = 11.5 → 12
  ] as const)('pot_material %s → %d', (mat, expected) => {
    expect(computeWateringInterval(base, { ...f, pot_material: mat })).toBe(
      expected,
    );
  });

  it.each([
    ['succulent_cactus', 15],
    ['orchid', 12],
    ['peat_free', 10],
    ['standard', 10],
    ['moisture_retaining', 8], // 7.5 → 8
  ] as const)('soil_type %s → %d', (soil, expected) => {
    expect(computeWateringInterval(base, { ...f, soil_type: soil })).toBe(
      expected,
    );
  });

  it.each([
    ['low', 13],
    ['medium', 10],
    ['bright_indirect', 9], // 8.5 → 9
    ['direct_sunlight', 7],
  ] as const)('light_level %s → %d', (light, expected) => {
    expect(computeWateringInterval(base, { ...f, light_level: light })).toBe(
      expected,
    );
  });

  it.each([
    ['indoor', 10],
    ['outdoor', 8], // 7.5 → 8
    ['greenhouse', 11],
  ] as const)('location_type %s → %d', (loc, expected) => {
    expect(computeWateringInterval(base, { ...f, location_type: loc })).toBe(
      expected,
    );
  });

  it('floors at 1 day even with extreme combination', () => {
    // base 1, every factor that decreases interval
    expect(
      computeWateringInterval(1, {
        pot_size: 'xs',
        pot_material: 'terracotta',
        soil_type: 'moisture_retaining',
        light_level: 'direct_sunlight',
        location_type: 'outdoor',
      }),
    ).toBe(1);
  });
});

describe('computeCalculatedInterval — only watering uses multipliers (§4.3 note)', () => {
  it('non-watering actions return raw species defaults', () => {
    const sp = baselineSpecies();
    const pot = baselinePot({ pot_size: 'xl', light_level: 'low' });
    expect(computeCalculatedInterval('fertilizing', sp, pot)).toBe(14);
    expect(computeCalculatedInterval('misting', sp, pot)).toBe(3);
    expect(computeCalculatedInterval('repotting', sp, pot)).toBe(365);
    expect(computeCalculatedInterval('pruning', sp, pot)).toBe(30);
    expect(computeCalculatedInterval('cleaning', sp, pot)).toBe(30);
  });

  it('watering does apply multipliers', () => {
    const sp = baselineSpecies();
    const pot = baselinePot({ pot_size: 'xl' }); // 10 * 1.6 = 16
    expect(computeCalculatedInterval('watering', sp, pot)).toBe(16);
  });
});

describe('effectiveInterval — custom schedule overrides (§8.3)', () => {
  const sp = baselineSpecies();
  const cs: CustomSchedule = {
    watering_interval_days: 5,
    fertilizing_interval_days: null,
    misting_interval_days: null,
    repotting_interval_days: null,
    pruning_interval_days: null,
    cleaning_interval_days: null,
  };

  it('uses custom value when use_custom_schedule = true and override is set', () => {
    const pot = baselinePot({ use_custom_schedule: true, custom_schedule: cs });
    expect(effectiveInterval(pot, sp, 'watering')).toBe(5);
  });

  it('falls back to calculated when custom value is null', () => {
    const pot = baselinePot({ use_custom_schedule: true, custom_schedule: cs });
    expect(effectiveInterval(pot, sp, 'fertilizing')).toBe(14);
  });

  it('ignores custom schedule entirely when use_custom_schedule = false', () => {
    const pot = baselinePot({ use_custom_schedule: false, custom_schedule: cs });
    expect(effectiveInterval(pot, sp, 'watering')).toBe(10);
  });
});

describe('computeNextDueAt — §4.4', () => {
  it('uses pot.created_at when last_performed_at is null', () => {
    const pot = baselinePot();
    const task = baselineTask({ last_performed_at: null, interval_days: 7 });
    expect(computeNextDueAt(task, pot)).toBe(pot.created_at + 7 * DAY);
  });

  it('uses last_performed_at when set', () => {
    const pot = baselinePot();
    const last = NOW + 5 * DAY;
    const task = baselineTask({ last_performed_at: last, interval_days: 7 });
    expect(computeNextDueAt(task, pot)).toBe(last + 7 * DAY);
  });
});

describe('state transitions', () => {
  it('applyComplete writes a completed log and resets next_due_at', () => {
    const t = baselineTask({ interval_days: 7, snooze_until: NOW + DAY });
    const { task, log } = applyComplete(t, NOW);
    expect(task.last_performed_at).toBe(NOW);
    expect(task.snooze_until).toBeNull();
    expect(task.next_due_at).toBe(NOW + 7 * DAY);
    expect(log.action).toBe('completed');
    expect(log.performed_at).toBe(NOW);
  });

  it('applySkip behaves like complete but logs skipped (§4.6)', () => {
    const t = baselineTask({ interval_days: 7 });
    const { task, log } = applySkip(t, NOW);
    expect(task.last_performed_at).toBe(NOW);
    expect(task.next_due_at).toBe(NOW + 7 * DAY);
    expect(log.action).toBe('skipped');
  });

  it('applySnooze sets snooze_until but does NOT change next_due_at (§4.5)', () => {
    const originalDue = NOW + 2 * DAY;
    const t = baselineTask({ next_due_at: originalDue });
    const until = NOW + DAY;
    const { task, log } = applySnooze(t, until, NOW);
    expect(task.snooze_until).toBe(until);
    expect(task.next_due_at).toBe(originalDue);
    expect(log.action).toBe('snoozed');
  });
});

describe('bucketTask — §5.3', () => {
  it('overdue when next_due_at is yesterday', () => {
    const t = baselineTask({ next_due_at: NOW - DAY });
    expect(bucketTask(t, NOW)).toBe('overdue');
  });

  it('today when next_due_at is later today', () => {
    const t = baselineTask({ next_due_at: NOW + 60 * 1000 });
    expect(bucketTask(t, NOW)).toBe('today');
  });

  it('upcoming when 1–3 days out', () => {
    expect(bucketTask(baselineTask({ next_due_at: NOW + 1 * DAY }), NOW)).toBe(
      'upcoming',
    );
    expect(bucketTask(baselineTask({ next_due_at: NOW + 3 * DAY }), NOW)).toBe(
      'upcoming',
    );
  });

  it('later when more than 3 days out', () => {
    expect(bucketTask(baselineTask({ next_due_at: NOW + 4 * DAY }), NOW)).toBe(
      'later',
    );
  });

  it('snoozed hides task even if it would be overdue', () => {
    const t = baselineTask({
      next_due_at: NOW - DAY,
      snooze_until: NOW + 2 * DAY,
    });
    expect(bucketTask(t, NOW)).toBe('snoozed');
  });

  it('disabled task → later (kept out of Today)', () => {
    const t = baselineTask({ next_due_at: NOW, is_enabled: false });
    expect(bucketTask(t, NOW)).toBe('later');
  });
});

describe('buildInitialTasks', () => {
  let counter = 0;
  const newId = () => `id-${++counter}`;

  it('creates 6 enabled tasks anchored at pot.created_at', () => {
    counter = 0;
    const sp = baselineSpecies();
    const pot = baselinePot();
    const tasks = buildInitialTasks(pot, sp, newId);
    expect(tasks).toHaveLength(6);
    for (const t of tasks) {
      expect(t.is_enabled).toBe(true);
      expect(t.last_performed_at).toBeNull();
      expect(t.next_due_at).toBe(pot.created_at + t.interval_days * DAY);
    }
    expect(tasks.find((t) => t.action_type === 'watering')!.interval_days).toBe(
      10,
    );
    expect(
      tasks.find((t) => t.action_type === 'repotting')!.interval_days,
    ).toBe(365);
  });
});

describe('recalculateTasks (§5.8)', () => {
  it('updates intervals when pot params change and re-anchors next_due_at', () => {
    const sp = baselineSpecies();
    const pot = baselinePot();
    const tasks = buildInitialTasks(pot, sp, () => 'x');

    // change pot to XL → watering interval becomes 16
    const updatedPot = { ...pot, pot_size: 'xl' as const };
    const recalculated = recalculateTasks(tasks, updatedPot, sp);
    const watering = recalculated.find((t) => t.action_type === 'watering')!;
    expect(watering.interval_days).toBe(16);
    expect(watering.next_due_at).toBe(pot.created_at + 16 * DAY);
  });

  it('preserves last_performed_at as the anchor when present', () => {
    const sp = baselineSpecies();
    const pot = baselinePot();
    const tasks = buildInitialTasks(pot, sp, () => 'x').map((t) =>
      t.action_type === 'watering' ? { ...t, last_performed_at: NOW } : t,
    );
    const updatedPot = { ...pot, pot_size: 'xl' as const };
    const recalculated = recalculateTasks(tasks, updatedPot, sp);
    const watering = recalculated.find((t) => t.action_type === 'watering')!;
    expect(watering.next_due_at).toBe(NOW + 16 * DAY);
  });
});
