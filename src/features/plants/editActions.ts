import {
  computeCalculatedInterval,
  recalculateTasks,
} from '../../domain/schedule';
import type {
  ActionType,
  CareTask,
  CustomSchedule,
  PlantSpecies,
  Pot,
} from '../../domain/types';
import { careTasksRepo, potsRepo } from '../../data/repositories';
import { syncNotifications } from '../../services/notifications';

const DAY = 24 * 60 * 60 * 1000;

export async function updatePotParams(input: {
  updatedPot: Pot;
  species: PlantSpecies;
  tasks: CareTask[];
}): Promise<void> {
  const { updatedPot, species, tasks } = input;
  await potsRepo.update(updatedPot);
  // Per §8.3: editing pot params with a custom schedule active must NOT touch
  // task intervals. We still re-anchor next_due_at to the latest last-performed
  // because an interval edit isn't happening — keep tasks untouched.
  if (updatedPot.use_custom_schedule) {
    void syncNotifications();
    return;
  }
  const recalculated = recalculateTasks(tasks, updatedPot, species);
  await careTasksRepo.replaceForPot(updatedPot.id, recalculated);
  void syncNotifications();
}

export interface CustomScheduleInput {
  watering_interval_days: number | null;
  fertilizing_interval_days: number | null;
  misting_interval_days: number | null;
  repotting_interval_days: number | null;
  pruning_interval_days: number | null;
  cleaning_interval_days: number | null;
}

const ACTIONS: ActionType[] = [
  'watering',
  'fertilizing',
  'misting',
  'repotting',
  'pruning',
  'cleaning',
];

function intervalKey(action: ActionType): keyof CustomSchedule {
  return `${action}_interval_days` as keyof CustomSchedule;
}

export async function saveCustomSchedule(input: {
  pot: Pot;
  species: PlantSpecies;
  tasks: CareTask[];
  enabled: boolean;
  values: CustomScheduleInput;
}): Promise<void> {
  const { pot, species, tasks, enabled, values } = input;

  const custom: CustomSchedule | null = enabled ? { ...values } : null;
  const updatedPot: Pot = {
    ...pot,
    use_custom_schedule: enabled,
    custom_schedule: custom,
  };
  await potsRepo.update(updatedPot);

  const nextTasks: CareTask[] = tasks.map((t) => {
    const interval = enabled
      ? (values[intervalKey(t.action_type) as keyof CustomScheduleInput] ??
        computeCalculatedInterval(t.action_type, species, updatedPot))
      : computeCalculatedInterval(t.action_type, species, updatedPot);
    const safeInterval = Math.max(1, Math.round(interval));
    const baseline = t.last_performed_at ?? updatedPot.created_at;
    return {
      ...t,
      interval_days: safeInterval,
      next_due_at: baseline + safeInterval * DAY,
    };
  });

  await careTasksRepo.replaceForPot(pot.id, nextTasks);
  void syncNotifications();
  void ACTIONS; // keep reference for future ordering checks
}
