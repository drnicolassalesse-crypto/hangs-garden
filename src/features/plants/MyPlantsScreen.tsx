import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  careTasksRepo,
  potsRepo,
  sitesRepo,
  speciesRepo,
} from '../../data/repositories';
import {
  matchesSearch,
  sortSummaries,
  summarizePlants,
  type SortKey,
} from '../../domain/plantSummary';
import type {
  CareTask,
  PlantSpecies,
  Pot,
  Site,
  UUID,
} from '../../domain/types';
import { t } from '../../i18n';
import { PlantCard } from './PlantCard';

type ViewMode = 'grid' | 'list';

export function MyPlantsScreen() {
  const [pots, setPots] = useState<Pot[] | null>(null);
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [species, setSpecies] = useState<PlantSpecies[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [now] = useState(() => Date.now());
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('next_due');
  const [siteFilter, setSiteFilter] = useState<UUID | 'all'>('all');
  const [mode, setMode] = useState<ViewMode>('grid');

  useEffect(() => {
    void (async () => {
      const [p, t, sp, si] = await Promise.all([
        potsRepo.listAll(),
        careTasksRepo.listAllEnabled(),
        speciesRepo.listAll(),
        sitesRepo.listAll(),
      ]);
      setPots(p);
      setTasks(t);
      setSpecies(sp);
      setSites(si);
    })();
  }, []);

  const summaries = useMemo(() => {
    if (!pots) return null;
    const all = summarizePlants({
      pots,
      tasks,
      species: new Map(species.map((s) => [s.id, s])),
      sites: new Map(sites.map((s) => [s.id, s])),
      now,
    });
    const filtered = all
      .filter((s) => (siteFilter === 'all' ? true : s.pot.site_id === siteFilter))
      .filter((s) => matchesSearch(s, search));
    return sortSummaries(filtered, sort);
  }, [pots, tasks, species, sites, now, search, sort, siteFilter]);

  return (
    <main className="mx-auto max-w-md p-4 pb-24">
      <header className="mb-3 flex items-center justify-between">
        <NavLink to="/" className="text-sm text-primary underline">
          {t('plants.back')}
        </NavLink>
        <h1 className="font-display text-xl font-bold text-primary">
          {summaries ? t('plants.headingCount', { count: summaries.length }) : t('plants.heading')}
        </h1>
        <button
          type="button"
          onClick={() => setMode((m) => (m === 'grid' ? 'list' : 'grid'))}
          className="rounded-full border border-black/10 px-2 py-1 text-xs text-ink-muted"
          aria-label="Toggle view"
        >
          {mode === 'grid' ? t('plants.viewList') : t('plants.viewGrid')}
        </button>
      </header>

      <div className="mb-3 flex flex-col gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('plants.search')}
          className="rounded-xl border border-black/10 bg-card px-4 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <div className="flex items-center gap-2">
          <label className="text-xs text-ink-muted">{t('plants.sort')}</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="flex-1 rounded-full border border-black/10 bg-card px-3 py-1 text-sm"
          >
            <option value="next_due">{t('plants.sort.nextDue')}</option>
            <option value="name">{t('plants.sort.name')}</option>
            <option value="site">{t('plants.sort.site')}</option>
          </select>
        </div>
        {sites.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <SiteChip
              active={siteFilter === 'all'}
              onClick={() => setSiteFilter('all')}
              label={t('plants.filter.allSites')}
              icon="🌿"
            />
            {sites.map((s) => (
              <SiteChip
                key={s.id}
                active={siteFilter === s.id}
                onClick={() => setSiteFilter(s.id)}
                label={s.name}
                icon={s.icon}
              />
            ))}
          </div>
        )}
      </div>

      {summaries === null ? (
        <p className="text-ink-muted">{t('common.loading')}</p>
      ) : summaries.length === 0 ? (
        <EmptyState hasAnyPots={(pots?.length ?? 0) > 0} hasSearch={!!search} />
      ) : mode === 'grid' ? (
        <div className="grid grid-cols-2 gap-3">
          {summaries.map((s) => (
            <PlantCard key={s.pot.id} summary={s} mode="grid" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {summaries.map((s) => (
            <PlantCard key={s.pot.id} summary={s} mode="list" />
          ))}
        </div>
      )}

      <div className="sticky bottom-4 mt-6 flex justify-center">
        <NavLink
          to="/add"
          className="rounded-full bg-primary px-5 py-3 text-white shadow-lg"
        >
          {t('plants.addPlant')}
        </NavLink>
      </div>
    </main>
  );
}

function SiteChip({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm transition ${
        active
          ? 'border-primary bg-primary text-white'
          : 'border-black/10 bg-card text-ink'
      }`}
    >
      <span className="mr-1">{icon}</span>
      {label}
    </button>
  );
}

function EmptyState({
  hasAnyPots,
  hasSearch,
}: {
  hasAnyPots: boolean;
  hasSearch: boolean;
}) {
  if (hasSearch)
    return (
      <p className="py-8 text-center text-ink-muted">
        {t('plants.empty.noMatch')}
      </p>
    );
  if (hasAnyPots)
    return (
      <p className="py-8 text-center text-ink-muted">
        {t('plants.empty.noFilter')}
      </p>
    );
  return (
    <div className="rounded-2xl border-2 border-dashed border-black/10 p-8 text-center">
      <div className="mb-2 text-4xl">🌱</div>
      <p className="mb-3 text-ink-muted">{t('plants.empty.none')}</p>
      <NavLink
        to="/add"
        className="rounded-full bg-primary px-4 py-2 text-sm text-white"
      >
        {t('plants.empty.cta')}
      </NavLink>
    </div>
  );
}
