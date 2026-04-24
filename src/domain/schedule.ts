// Schedule calculation engine — spec §4 + §8.
// Pure functions, no side effects, no I/O. Time inputs are epoch milliseconds.

import type {
  ActionType,
  CareLog,
  CareTask,
  LightLevel,
  LocationType,
  PlantSpecies,
  Pot,
  PotMaterial,
  PotSize,
  SoilType,
  TaskBucket,
  UUID,
} from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

// §4.2 multipliers ---------------------------------------------------------

const POT_SIZE_MULT: Record<PotSize, number> = {
  xs: 0.6,
  s: 0.8,
  m: 1.0,
  l: 1.3,
  xl: 1.6,
};

const POT_MATERIAL_MULT: Record<PotMaterial, number> = {
  terracotta: 0.7,
  fabric: 0.75,
  wood: 0.85,
  plastic: 1.0,
  metal: 1.0,
  ceramic: 1.1,
  glass: 1.15,
};

const SOIL_TYPE_MULT: Record<SoilType, number> = {
  succulent_cactus: 1.5,
  orchid: 1.2,
  peat_free: 1.0,
  standard: 1.0,
  moisture_retaining: 0.75,
};

const LIGHT_LEVEL_MULT: Record<LightLevel, number> = {
  low: 1.3,
  medium: 1.0,
  bright_indirect: 0.85,
  direct_sunlight: 0.7,
};

const LOCATION_MULT: Record<LocationType, number> = {
  indoor: 1.0,
  outdoor: 0.75,
  greenhouse: 1.1,
};

export interface WateringFactors {
  pot_size: PotSize;
  pot_material: PotMaterial;
  soil_type: SoilType;
  light_level: LightLevel;
  location_type: LocationType;
}

// §4.3 — final watering interval
export function computeWateringInterval(
  baseDays: number,
  f: WateringFactors,
): number {
  const raw =
    baseDays *
    POT_SIZE_MULT[f.pot_size] *
    POT_MATERIAL_MULT[f.pot_material] *
    SOIL_TYPE_MULT[f.soil_type] *
    LIGHT_LEVEL_MULT[f.light_level] *
    LOCATION_MULT[f.location_type];
  return Math.max(1, Math.round(raw));
}

// Per spec §4.3 note: only watering uses the multipliers. All other actions
// use the species default unchanged unless the user customises them.
export function computeCalculatedInterval(
  action: ActionType,
  species: PlantSpecies,
  pot: Pot,
): number {
  const d = species.care_defaults;
  switch (action) {
    case 'watering':
      return computeWateringInterval(d.watering_interval_days, pot);
    case 'fertilizing':
      return d.fertilizing_interval_days;
    case 'misting':
      return d.misting_interval_days;
    case 'repotting':
      return d.repotting_interval_days;
    case 'pruning':
      return d.pruning_interval_days;
    case 'cleaning':
      return d.cleaning_interval_days;
  }
}

// §8.3 — custom schedule overrides
export function effectiveInterval(
  pot: Pot,
  species: PlantSpecies,
  action: ActionType,
): number {
  if (pot.use_custom_schedule && pot.custom_schedule) {
    const key = `${action}_interval_days` as keyof typeof pot.custom_schedule;
    const override = pot.custom_schedule[key];
    if (typeof override === 'number' && override > 0) return override;
  }
  return computeCalculatedInterval(action, species, pot);
}

// §4.4 — next_due_at computation
export function computeNextDueAt(task: CareTask, pot: Pot): number {
  const baseline = task.last_performed_at ?? pot.created_at;
  return baseline + task.interval_days * DAY_MS;
}

// §4.5 / 4.6 / 4.7 — state transitions ------------------------------------

export interface TransitionResult {
  task: CareTask;
  log: Omit<CareLog, 'id'>;
}

function makeLog(
  task: CareTask,
  action: CareLog['action'],
  performed_at: number,
  notes: string | null = null,
): Omit<CareLog, 'id'> {
  return {
    pot_id: task.pot_id,
    care_task_id: task.id,
    action_type: task.action_type,
    action,
    performed_at,
    notes,
    photo_blob_id: null,
  };
}

// §4.7 Complete
export function applyComplete(task: CareTask, now: number): TransitionResult {
  const updated: CareTask = {
    ...task,
    last_performed_at: now,
    snooze_until: null,
    next_due_at: now + task.interval_days * DAY_MS,
  };
  return { task: updated, log: makeLog(task, 'completed', now) };
}

// §4.6 Skip — interval resets the same way as Complete
export function applySkip(task: CareTask, now: number): TransitionResult {
  const updated: CareTask = {
    ...task,
    last_performed_at: now,
    snooze_until: null,
    next_due_at: now + task.interval_days * DAY_MS,
  };
  return { task: updated, log: makeLog(task, 'skipped', now) };
}

// §4.5 Snooze — does NOT change next_due_at, only UI visibility
export function applySnooze(
  task: CareTask,
  until: number,
  now: number,
): TransitionResult {
  const updated: CareTask = {
    ...task,
    snooze_until: until,
  };
  return { task: updated, log: makeLog(task, 'snoozed', now) };
}

// §5.3 Today screen bucketing ---------------------------------------------

const startOfDay = (ts: number): number => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export function bucketTask(task: CareTask, now: number): TaskBucket {
  if (!task.is_enabled) return 'later';
  if (task.snooze_until && task.snooze_until > now) return 'snoozed';

  const today = startOfDay(now);
  const dueDay = startOfDay(task.next_due_at);
  const diffDays = Math.round((dueDay - today) / DAY_MS);

  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'today';
  if (diffDays <= 3) return 'upcoming';
  return 'later';
}

// Helper for Add Plant flow — build the 6 default tasks for a new pot.
export function buildInitialTasks(
  pot: Pot,
  species: PlantSpecies,
  newId: () => UUID,
): CareTask[] {
  const actions: ActionType[] = [
    'watering',
    'fertilizing',
    'misting',
    'repotting',
    'pruning',
    'cleaning',
  ];
  return actions.map((action) => {
    const interval = effectiveInterval(pot, species, action);
    const baseline = pot.created_at;
    return {
      id: newId(),
      pot_id: pot.id,
      action_type: action,
      is_enabled: true,
      interval_days: interval,
      last_performed_at: null,
      next_due_at: baseline + interval * DAY_MS,
      snooze_until: null,
      notes: null,
    };
  });
}

// Re-derive intervals + next_due_at when pot params change (§5.8) —
// only when the pot is NOT on a custom schedule (§8.3).
export function recalculateTasks(
  tasks: CareTask[],
  pot: Pot,
  species: PlantSpecies,
): CareTask[] {
  return tasks.map((t) => {
    const interval = effectiveInterval(pot, species, t.action_type);
    const baseline = t.last_performed_at ?? pot.created_at;
    return {
      ...t,
      interval_days: interval,
      next_due_at: baseline + interval * DAY_MS,
    };
  });
}

export const __internal = { DAY_MS, startOfDay };
