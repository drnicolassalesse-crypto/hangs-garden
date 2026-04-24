import type {
  CareTask,
  PlantSpecies,
  Pot,
  Site,
  UUID,
} from './types';

const DAY = 24 * 60 * 60 * 1000;

const startOfDay = (ts: number): number => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export interface PlantSummary {
  pot: Pot;
  species: PlantSpecies | null;
  site: Site | null;
  nextDueTask: CareTask | null;
  nextDueInDays: number | null; // negative = overdue, 0 = today, positive = in future
  anyOverdue: boolean;
}

export function summarizePlants(input: {
  pots: Pot[];
  tasks: CareTask[];
  species: Map<UUID, PlantSpecies>;
  sites: Map<UUID, Site>;
  now: number;
}): PlantSummary[] {
  const { pots, tasks, species, sites, now } = input;
  const today = startOfDay(now);

  const tasksByPot = new Map<UUID, CareTask[]>();
  for (const t of tasks) {
    if (!t.is_enabled) continue;
    const arr = tasksByPot.get(t.pot_id);
    if (arr) arr.push(t);
    else tasksByPot.set(t.pot_id, [t]);
  }

  return pots.map((pot) => {
    const potTasks = tasksByPot.get(pot.id) ?? [];
    // Effective due time accounting for snooze_until
    const visible = potTasks.filter(
      (t) => !(t.snooze_until && t.snooze_until > now),
    );
    let nextDueTask: CareTask | null = null;
    for (const t of visible) {
      if (!nextDueTask || t.next_due_at < nextDueTask.next_due_at) {
        nextDueTask = t;
      }
    }
    const anyOverdue = visible.some(
      (t) => startOfDay(t.next_due_at) < today,
    );
    const nextDueInDays =
      nextDueTask !== null
        ? Math.round((startOfDay(nextDueTask.next_due_at) - today) / DAY)
        : null;

    return {
      pot,
      species: species.get(pot.species_id) ?? null,
      site: pot.site_id ? sites.get(pot.site_id) ?? null : null,
      nextDueTask,
      nextDueInDays,
      anyOverdue,
    };
  });
}

export type SortKey = 'name' | 'next_due' | 'site';

export function sortSummaries(
  summaries: PlantSummary[],
  key: SortKey,
): PlantSummary[] {
  const copy = [...summaries];
  if (key === 'name') {
    copy.sort((a, b) =>
      a.pot.display_name.localeCompare(b.pot.display_name, undefined, {
        sensitivity: 'base',
      }),
    );
  } else if (key === 'next_due') {
    copy.sort((a, b) => {
      const av = a.nextDueTask?.next_due_at ?? Number.POSITIVE_INFINITY;
      const bv = b.nextDueTask?.next_due_at ?? Number.POSITIVE_INFINITY;
      return av - bv;
    });
  } else {
    copy.sort((a, b) => {
      const an = a.site?.name ?? '\uffff';
      const bn = b.site?.name ?? '\uffff';
      const s = an.localeCompare(bn, undefined, { sensitivity: 'base' });
      if (s !== 0) return s;
      return a.pot.display_name.localeCompare(b.pot.display_name, undefined, {
        sensitivity: 'base',
      });
    });
  }
  return copy;
}

export function matchesSearch(s: PlantSummary, term: string): boolean {
  const t = term.trim().toLowerCase();
  if (!t) return true;
  const haystacks: string[] = [s.pot.display_name];
  if (s.species) {
    haystacks.push(s.species.common_name, s.species.scientific_name);
    for (const tag of s.species.tags) {
      if (tag.startsWith('vi_name:')) haystacks.push(tag.slice(8));
    }
  }
  return haystacks.some((h) => h.toLowerCase().includes(t));
}

export function nextDueLabel(summary: PlantSummary): string {
  if (!summary.nextDueTask || summary.nextDueInDays === null) return 'No tasks';
  const d = summary.nextDueInDays;
  if (d === 0) return 'Today';
  if (d < 0) {
    const n = Math.abs(d);
    return `${n} day${n === 1 ? '' : 's'} overdue`;
  }
  return `in ${d} day${d === 1 ? '' : 's'}`;
}
