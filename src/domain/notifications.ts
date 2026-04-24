import type {
  CareTask,
  NotificationFrequency,
  PlantSpecies,
  Pot,
  UUID,
} from './types';
import { t } from '../i18n';

const DAY = 24 * 60 * 60 * 1000;

export type NotificationKind =
  | 'pre_2d'
  | 'pre_1d'
  | 'due'
  | 'overdue'
  | 'snooze_expiry';

export interface PlannedNotification {
  id: string; // stable identity per (task, kind) so we can dedupe/cancel
  task_id: UUID;
  pot_id: UUID;
  kind: NotificationKind;
  fire_at: number;
  title: string;
  body: string;
}

interface PlanInput {
  tasks: CareTask[];
  pots: Map<UUID, Pot>;
  species: Map<UUID, PlantSpecies>;
  frequency: NotificationFrequency;
  reminderTime: string; // "HH:MM"
  now: number;
  horizonDays?: number; // default 60
}

const ACTION_KEYS: Record<CareTask['action_type'], string> = {
  watering: 'water',
  fertilizing: 'fertilize',
  misting: 'mist',
  repotting: 'repot',
  pruning: 'prune',
  cleaning: 'clean',
};

function shiftToReminderTime(ts: number, hhmm: string): number {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  const d = new Date(ts);
  d.setHours(Number.isFinite(h) ? h : 8, Number.isFinite(m) ? m : 0, 0, 0);
  return d.getTime();
}

function describe(task: CareTask, pot: Pot, species: PlantSpecies | undefined) {
  const actionKey = ACTION_KEYS[task.action_type];
  const emoji = t(`action.${task.action_type}.emoji`);
  const verb = t(`notif.action.${actionKey}`);
  const pastVerb = t(`notif.action.${actionKey}.past`);
  const plant = species?.common_name
    ? `${pot.display_name} (${species.common_name})`
    : pot.display_name;
  return { emoji, verb, pastVerb, plant };
}

export function planNotifications(input: PlanInput): PlannedNotification[] {
  const {
    tasks,
    pots,
    species,
    frequency,
    reminderTime,
    now,
    horizonDays = 60,
  } = input;
  const horizon = now + horizonDays * DAY;
  const out: PlannedNotification[] = [];

  for (const task of tasks) {
    if (!task.is_enabled) continue;
    const pot = pots.get(task.pot_id);
    if (!pot) continue;
    const sp = species.get(pot.species_id);
    const { emoji, verb, pastVerb, plant } = describe(task, pot, sp);
    const dueAt = shiftToReminderTime(task.next_due_at, reminderTime);

    // Snooze expiry — reminder when a snoozed task "wakes up"
    if (task.snooze_until && task.snooze_until > now && task.snooze_until <= horizon) {
      out.push({
        id: `${task.id}:snooze_expiry`,
        task_id: task.id,
        pot_id: pot.id,
        kind: 'snooze_expiry',
        fire_at: task.snooze_until,
        title: t('notif.snoozeEnded', { emoji }),
        body: t('notif.snoozeBody', { verb, plant }),
      });
      // While snoozed, don't stack the usual pre/due reminders.
      continue;
    }

    if (dueAt >= now && dueAt <= horizon) {
      out.push({
        id: `${task.id}:due`,
        task_id: task.id,
        pot_id: pot.id,
        kind: 'due',
        fire_at: dueAt,
        title: t('notif.dueTitle', { emoji, verb }),
        body: t('notif.dueBody', { plant, verb }),
      });
    }

    if (frequency === 'moderate' || frequency === 'frequent') {
      const at = dueAt - 1 * DAY;
      if (at >= now && at <= horizon) {
        out.push({
          id: `${task.id}:pre_1d`,
          task_id: task.id,
          pot_id: pot.id,
          kind: 'pre_1d',
          fire_at: at,
          title: t('notif.pre1d.title', { emoji, plant }),
          body: t('notif.pre1d.body', { plant, verb }),
        });
      }
    }

    if (frequency === 'frequent') {
      const at2 = dueAt - 2 * DAY;
      if (at2 >= now && at2 <= horizon) {
        out.push({
          id: `${task.id}:pre_2d`,
          task_id: task.id,
          pot_id: pot.id,
          kind: 'pre_2d',
          fire_at: at2,
          title: t('notif.pre2d.title', { emoji, plant }),
          body: t('notif.pre2d.body', { verb, plant }),
        });
      }
      const over = dueAt + 1 * DAY;
      if (over >= now && over <= horizon) {
        out.push({
          id: `${task.id}:overdue`,
          task_id: task.id,
          pot_id: pot.id,
          kind: 'overdue',
          fire_at: over,
          title: t('notif.overdue.title', { plant }),
          body: t('notif.overdue.body', { plant, pastVerb }),
        });
      }
    }
  }

  out.sort((a, b) => a.fire_at - b.fire_at);
  return out;
}

// Platform limits — iOS historically capped at 64 pending notifications.
export const MAX_SCHEDULED = 64;

export function capToPlatformLimit(
  planned: PlannedNotification[],
  max: number = MAX_SCHEDULED,
): PlannedNotification[] {
  if (planned.length <= max) return planned;
  return planned.slice(0, max);
}
