import { bucketTask } from './schedule';
import type {
  ActionType,
  CareTask,
  PlantSpecies,
  Pot,
  Site,
  TaskBucket,
  UUID,
} from './types';
import { t, tp } from '../i18n';

export interface TodayRow {
  task: CareTask;
  pot: Pot;
  species: PlantSpecies | null;
  site: Site | null;
  bucket: Exclude<TaskBucket, 'later'>;
}

export interface TodayView {
  overdue: TodayRow[];
  today: TodayRow[];
  upcoming: TodayRow[];
  totalVisible: number;
}

export interface BuildTodayViewInput {
  tasks: CareTask[];
  pots: Map<UUID, Pot>;
  species: Map<UUID, PlantSpecies>;
  sites: Map<UUID, Site>;
  now: number;
  actionFilter?: ActionType | 'all';
  siteFilter?: UUID | 'all';
}

export function buildTodayView(input: BuildTodayViewInput): TodayView {
  const { tasks, pots, species, sites, now } = input;
  const actionFilter = input.actionFilter ?? 'all';
  const siteFilter = input.siteFilter ?? 'all';

  const overdue: TodayRow[] = [];
  const today: TodayRow[] = [];
  const upcoming: TodayRow[] = [];

  for (const task of tasks) {
    if (!task.is_enabled) continue;
    if (actionFilter !== 'all' && task.action_type !== actionFilter) continue;

    const bucket = bucketTask(task, now);
    if (bucket !== 'overdue' && bucket !== 'today' && bucket !== 'upcoming') {
      continue;
    }

    const pot = pots.get(task.pot_id);
    if (!pot) continue;

    if (siteFilter !== 'all' && pot.site_id !== siteFilter) continue;

    const row: TodayRow = {
      task,
      pot,
      species: species.get(pot.species_id) ?? null,
      site: pot.site_id ? sites.get(pot.site_id) ?? null : null,
      bucket,
    };

    if (bucket === 'overdue') overdue.push(row);
    else if (bucket === 'today') today.push(row);
    else upcoming.push(row);
  }

  overdue.sort((a, b) => a.task.next_due_at - b.task.next_due_at);
  today.sort((a, b) => a.task.next_due_at - b.task.next_due_at);
  upcoming.sort((a, b) => a.task.next_due_at - b.task.next_due_at);

  return {
    overdue,
    today,
    upcoming,
    totalVisible: overdue.length + today.length + upcoming.length,
  };
}

export function dueLabel(task: CareTask, now: number): string {
  const DAY = 24 * 60 * 60 * 1000;
  const startOfDay = (ts: number) => {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const diffDays = Math.round(
    (startOfDay(task.next_due_at) - startOfDay(now)) / DAY,
  );
  if (diffDays === 0) return t('due.today');
  if (diffDays < 0) {
    const n = Math.abs(diffDays);
    return tp('due.overdue', n);
  }
  return tp('due.upcoming', diffDays);
}
