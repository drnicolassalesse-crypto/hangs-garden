import { beforeAll, describe, expect, it } from 'vitest';
import {
  capToPlatformLimit,
  planNotifications,
  type PlannedNotification,
} from '../notifications';
import { setLocale } from '../../i18n';
import type {
  CareTask,
  NotificationFrequency,
  PlantSpecies,
  Pot,
  UUID,
} from '../types';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 3, 14, 6, 0, 0); // 2026-04-14T06:00Z

const pot: Pot = {
  id: 'p',
  species_id: 'sp',
  display_name: 'Rose 1',
  photo_blob_id: null,
  site_id: null,
  created_at: NOW - 10 * DAY,
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

const task = (overrides: Partial<CareTask> = {}): CareTask => ({
  id: 't',
  pot_id: 'p',
  action_type: 'watering',
  is_enabled: true,
  interval_days: 7,
  last_performed_at: null,
  next_due_at: NOW + 3 * DAY, // 3 days away, 00:00 UTC + some hours doesn't matter
  snooze_until: null,
  notes: null,
  ...overrides,
});

function call(
  tasks: CareTask[],
  frequency: NotificationFrequency,
  reminderTime = '08:00',
  now = NOW,
): PlannedNotification[] {
  return planNotifications({
    tasks,
    pots: new Map<UUID, Pot>([[pot.id, pot]]),
    species: new Map<UUID, PlantSpecies>([[species.id, species]]),
    frequency,
    reminderTime,
    now,
  });
}

beforeAll(() => setLocale('en'));

describe('planNotifications', () => {
  it('minimal frequency emits only the due reminder', () => {
    const out = call([task()], 'minimal');
    const kinds = out.map((n) => n.kind);
    expect(kinds).toEqual(['due']);
  });

  it('moderate frequency adds a day-before reminder', () => {
    const out = call([task()], 'moderate');
    expect(out.map((n) => n.kind).sort()).toEqual(['due', 'pre_1d']);
  });

  it('frequent frequency adds pre_2d and overdue alerts', () => {
    const out = call([task()], 'frequent');
    const kinds = out.map((n) => n.kind).sort();
    expect(kinds).toEqual(['due', 'overdue', 'pre_1d', 'pre_2d']);
  });

  it('respects reminder_time (shifts due_at to configured HH:MM)', () => {
    // next_due_at midnight; reminderTime 09:30 → fire_at is 09:30 local on that day
    const dueMidnight = Date.UTC(2026, 3, 17, 0, 0, 0);
    const out = call([task({ next_due_at: dueMidnight })], 'minimal', '09:30');
    const fire = new Date(out[0].fire_at);
    expect(fire.getHours()).toBe(9);
    expect(fire.getMinutes()).toBe(30);
  });

  it('skips notifications in the past', () => {
    const out = call([task({ next_due_at: NOW - 2 * DAY })], 'frequent');
    // only overdue (NOW - 2d + 1d = NOW - 1d, still past) — all in the past, should be empty
    expect(out).toEqual([]);
  });

  it('drops disabled tasks', () => {
    const out = call([task({ is_enabled: false })], 'frequent');
    expect(out).toEqual([]);
  });

  it('respects horizonDays', () => {
    const out = planNotifications({
      tasks: [task({ next_due_at: NOW + 100 * DAY })],
      pots: new Map([[pot.id, pot]]),
      species: new Map([[species.id, species]]),
      frequency: 'frequent',
      reminderTime: '08:00',
      now: NOW,
      horizonDays: 30,
    });
    expect(out).toEqual([]);
  });

  it('schedules a snooze_expiry reminder instead of due when snoozed', () => {
    const snoozeUntil = NOW + 1.5 * DAY;
    const out = call(
      [
        task({
          snooze_until: snoozeUntil,
          next_due_at: NOW + 3 * DAY,
        }),
      ],
      'frequent',
    );
    const kinds = out.map((n) => n.kind);
    expect(kinds).toEqual(['snooze_expiry']);
    expect(out[0].fire_at).toBe(snoozeUntil);
  });

  it('caps to platform limit', () => {
    const many: PlannedNotification[] = Array.from({ length: 100 }, (_, i) => ({
      id: `n${i}`,
      task_id: 't',
      pot_id: 'p',
      kind: 'due',
      fire_at: NOW + i * 1000,
      title: 't',
      body: 'b',
    }));
    expect(capToPlatformLimit(many, 10)).toHaveLength(10);
  });
});
