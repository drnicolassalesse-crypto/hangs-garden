import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  careTasksRepo,
  potsRepo,
  sitesRepo,
  speciesRepo,
} from '../../data/repositories';
import { buildTodayView, type TodayRow } from '../../domain/todayView';
import type {
  ActionType,
  CareTask,
  PlantSpecies,
  Pot,
  Site,
  UUID,
} from '../../domain/types';
import { TaskCard } from './TaskCard';
import { completeTask, skipTask, snoozeTask } from './actions';
import { NotificationBanner } from './NotificationBanner';
import { t, useLocale } from '../../i18n';

const ACTION_TYPES: (ActionType | 'all')[] = [
  'all', 'watering', 'fertilizing', 'misting', 'repotting', 'pruning', 'cleaning',
];

function chipLabel(value: ActionType | 'all'): string {
  if (value === 'all') return t('today.filter.all');
  return `${t(`action.${value}.emoji`)} ${t(`action.${value}`)}`;
}

export function TodayScreen() {
  const locale = useLocale();
  const [tasks, setTasks] = useState<CareTask[] | null>(null);
  const [pots, setPots] = useState<Pot[]>([]);
  const [species, setSpecies] = useState<PlantSpecies[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [now, setNow] = useState<number>(() => Date.now());
  const [actionFilter, setActionFilter] = useState<ActionType | 'all'>('all');
  const [siteFilter, setSiteFilter] = useState<UUID | 'all'>('all');

  const load = useCallback(async () => {
    const [t, p, sp, si] = await Promise.all([
      careTasksRepo.listAllEnabled(),
      potsRepo.listAll(),
      speciesRepo.listAll(),
      sitesRepo.listAll(),
    ]);
    setTasks(t);
    setPots(p);
    setSpecies(sp);
    setSites(si);
    setNow(Date.now());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const view = useMemo(() => {
    if (!tasks) return null;
    return buildTodayView({
      tasks,
      pots: new Map(pots.map((p) => [p.id, p])),
      species: new Map(species.map((s) => [s.id, s])),
      sites: new Map(sites.map((s) => [s.id, s])),
      now,
      actionFilter,
      siteFilter,
    });
  }, [tasks, pots, species, sites, now, actionFilter, siteFilter]);

  async function handleComplete(id: UUID, fertilizerId: UUID | null) {
    await completeTask(id, fertilizerId);
    await load();
  }
  async function handleSkip(id: UUID) {
    await skipTask(id);
    await load();
  }
  async function handleSnooze(id: UUID, until: number) {
    await snoozeTask(id, until);
    await load();
  }

  // Force re-render on locale change
  void locale;

  return (
    <main className="mx-auto max-w-md p-4 pb-24">
      <header className="mb-3 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-primary">{t('today.heading')}</h1>
        <nav className="flex items-center gap-3 text-sm text-primary">
          <NavLink to="/plants" className="underline">
            {t('today.nav.plants')}
          </NavLink>
          <NavLink to="/sites" className="underline">
            {t('today.nav.sites')}
          </NavLink>
          <NavLink
            to="/settings"
            aria-label={t('settings.heading')}
            className="rounded-full p-1 text-lg leading-none"
          >
            ⚙️
          </NavLink>
        </nav>
      </header>

      <NotificationBanner />

      <div className="sticky top-0 z-10 -mx-4 mb-3 bg-surface/95 px-4 py-2 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {ACTION_TYPES.map((value) => (
            <button
              key={value}
              onClick={() => setActionFilter(value)}
              className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm transition ${
                actionFilter === value
                  ? 'border-primary bg-primary text-white'
                  : 'border-black/10 bg-card text-ink'
              }`}
            >
              {chipLabel(value)}
            </button>
          ))}
        </div>
        {sites.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <label className="text-xs text-ink-muted">{t('today.filter.site')}</label>
            <select
              value={siteFilter}
              onChange={(e) =>
                setSiteFilter(
                  e.target.value === 'all' ? 'all' : (e.target.value as UUID),
                )
              }
              className="flex-1 rounded-full border border-black/10 bg-card px-3 py-1 text-sm"
            >
              <option value="all">{t('today.filter.allSites')}</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.icon} {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {view === null ? (
        <p className="text-ink-muted">{t('common.loading')}</p>
      ) : view.totalVisible === 0 ? (
        <EmptyState hasPots={pots.length > 0} />
      ) : (
        <div className="flex flex-col gap-4">
          <Section
            title={t('today.section.overdue')}
            tone="overdue"
            rows={view.overdue}
            now={now}
            onComplete={handleComplete}
            onSkip={handleSkip}
            onSnooze={handleSnooze}
          />
          <Section
            title={t('today.section.today')}
            tone="today"
            rows={view.today}
            now={now}
            onComplete={handleComplete}
            onSkip={handleSkip}
            onSnooze={handleSnooze}
          />
          <Section
            title={t('today.section.upcoming')}
            tone="upcoming"
            rows={view.upcoming}
            now={now}
            onComplete={handleComplete}
            onSkip={handleSkip}
            onSnooze={handleSnooze}
          />
        </div>
      )}
    </main>
  );
}

function EmptyState({ hasPots }: { hasPots: boolean }) {
  if (!hasPots) {
    return (
      <div className="mt-16 flex flex-col items-center gap-3 text-center">
        <div className="text-5xl">🌱</div>
        <h2 className="font-display text-xl font-semibold text-ink">
          {t('today.empty.noPlants.title')}
        </h2>
        <p className="max-w-xs text-sm text-ink-muted">
          {t('today.empty.noPlants.body')}
        </p>
        <NavLink
          to="/add"
          className="mt-2 rounded-full bg-primary px-5 py-3 text-white shadow-sm"
        >
          {t('today.empty.noPlants.cta')}
        </NavLink>
      </div>
    );
  }
  return (
    <div className="mt-16 text-center">
      <div className="text-5xl">🎉</div>
      <h2 className="font-display mt-3 text-xl font-semibold text-ink">
        {t('today.empty.allDone.title')}
      </h2>
      <p className="text-sm text-ink-muted">{t('today.empty.allDone.body')}</p>
    </div>
  );
}

function Section({
  title,
  tone,
  rows,
  now,
  onComplete,
  onSkip,
  onSnooze,
}: {
  title: string;
  tone: 'overdue' | 'today' | 'upcoming';
  rows: TodayRow[];
  now: number;
  onComplete: (id: UUID, fertilizerId: UUID | null) => void;
  onSkip: (id: UUID) => void;
  onSnooze: (id: UUID, until: number) => void;
}) {
  if (rows.length === 0) return null;
  const toneClass =
    tone === 'overdue'
      ? 'text-overdue'
      : tone === 'today'
        ? 'text-success'
        : 'text-ink-muted';
  return (
    <section>
      <h2
        className={`mb-2 text-xs font-semibold uppercase tracking-wide ${toneClass}`}
      >
        {title} ({rows.length})
      </h2>
      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <TaskCard
            key={row.task.id}
            row={row}
            now={now}
            onComplete={(fertilizerId) => onComplete(row.task.id, fertilizerId)}
            onSkip={() => onSkip(row.task.id)}
            onSnooze={(until) => onSnooze(row.task.id, until)}
          />
        ))}
      </div>
    </section>
  );
}
