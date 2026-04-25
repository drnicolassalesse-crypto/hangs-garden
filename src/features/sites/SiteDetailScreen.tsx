import { useCallback, useEffect, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import {
  careTasksRepo,
  potsRepo,
  sitesRepo,
  speciesRepo,
} from '../../data/repositories';
import { summarizePlants, type PlantSummary } from '../../domain/plantSummary';
import type { Site, UUID } from '../../domain/types';
import { PlantCard } from '../plants/PlantCard';
import { TextInput } from '../../ui/Field';
import { t, tp } from '../../i18n';

export function SiteDetailScreen() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();

  const [site, setSite] = useState<Site | null>(null);
  const [rows, setRows] = useState<PlantSummary[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [iconDraft, setIconDraft] = useState('🌿');
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!siteId) return;
    const sites = await sitesRepo.listAll();
    const mine = sites.find((s) => s.id === siteId);
    if (!mine) {
      setNotFound(true);
      return;
    }
    setSite(mine);
    setNameDraft(mine.name);
    setIconDraft(mine.icon);

    const [pots, tasks, species] = await Promise.all([
      potsRepo.listBySite(siteId as UUID),
      careTasksRepo.listAllEnabled(),
      speciesRepo.listAll(),
    ]);
    const summaries = summarizePlants({
      pots,
      tasks,
      species: new Map(species.map((s) => [s.id, s])),
      sites: new Map([[mine.id, mine]]),
      now: Date.now(),
    });
    setRows(summaries);
  }, [siteId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (notFound) {
    return (
      <main className="mx-auto max-w-md p-6">
        <NavLink to="/sites" className="text-sm text-primary underline">
          {t('siteDetail.back')}
        </NavLink>
        <p className="mt-6 text-center text-ink-muted">
          {t('siteDetail.deleted')}
        </p>
      </main>
    );
  }

  if (!site || !rows) {
    return <main className="p-6 text-ink-muted">{t('common.loading')}</main>;
  }

  async function saveEdit() {
    if (!site) return;
    const name = nameDraft.trim();
    if (!name) return;
    await sitesRepo.rename(site.id, name, iconDraft || site.icon);
    setEditing(false);
    await load();
  }

  async function confirmDelete() {
    if (!site) return;
    const sure = window.confirm(
      t('siteDetail.confirmDelete', { name: site.name }),
    );
    if (!sure) return;
    await sitesRepo.delete(site.id);
    navigate('/sites');
  }

  return (
    <main className="mx-auto max-w-md p-4 pb-12">
      <header className="mb-4 flex items-center justify-between">
        <NavLink to="/sites" className="text-sm text-primary underline">
          {t('siteDetail.back')}
        </NavLink>
        <span />
      </header>

      {editing ? (
        <div className="mb-4 rounded-2xl bg-card p-4 shadow-sm">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
            {t('siteDetail.editSite')}
          </div>
          <div className="flex gap-2">
            <TextInput
              value={iconDraft}
              onChange={(e) => setIconDraft(e.target.value.slice(0, 2))}
              maxLength={2}
              className="w-16 text-center"
            />
            <TextInput
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              className="flex-1"
              autoFocus
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-full border border-black/10 px-4 py-2 text-sm"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={saveEdit}
              disabled={!nameDraft.trim()}
              className="flex-1 rounded-full bg-primary px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-3xl">
            {site.icon}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-semibold text-ink">
              {site.name}
            </h1>
            <p className="text-xs text-ink-muted">
              {tp('common.pot', rows.length)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-full border border-black/10 px-3 py-1 text-sm"
          >
            {t('common.edit')}
          </button>
        </div>
      )}

      {/* Garden Layout entry point */}
      <NavLink
        to={`/sites/${siteId}/layout`}
        className={`mb-4 flex items-center gap-3 rounded-2xl p-4 ${
          site.layout
            ? 'bg-card shadow-sm'
            : 'border-2 border-dashed border-black/10'
        }`}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-xl">
          {'\u{1F5FA}'}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-ink">
            {site.layout
              ? t('gardenLayout.viewLayout')
              : t('gardenLayout.createLayout')}
          </div>
          {!site.layout && (
            <div className="text-xs text-ink-muted">
              {t('gardenLayout.createLayout.hint')}
            </div>
          )}
        </div>
        <span className="text-ink-muted">&rsaquo;</span>
      </NavLink>

      {rows.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-black/10 p-6 text-center">
          <p className="mb-3 text-sm text-ink-muted">
            {t('siteDetail.noPots')}
          </p>
          <NavLink
            to="/add"
            className="rounded-full bg-primary px-4 py-2 text-sm text-white"
          >
            {t('siteDetail.addPlant')}
          </NavLink>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.pot.id}>
              <PlantCard summary={row} mode="list" />
            </li>
          ))}
        </ul>
      )}

      <section className="mt-8 rounded-2xl border border-overdue/30 bg-card p-4 shadow-sm">
        <h3 className="text-sm font-medium text-overdue">{t('siteDetail.dangerZone')}</h3>
        <p className="mt-1 text-xs text-ink-muted">
          {t('siteDetail.deleteWarning')}
        </p>
        <button
          type="button"
          onClick={confirmDelete}
          className="mt-3 rounded-full border border-overdue/40 px-4 py-2 text-sm text-overdue"
        >
          {t('siteDetail.deleteSite')}
        </button>
      </section>
    </main>
  );
}
