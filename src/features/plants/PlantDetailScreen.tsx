import { useCallback, useEffect, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import {
  careTasksRepo,
  imagesRepo,
  journalRepo,
  potsRepo,
  sitesRepo,
  speciesRepo,
} from '../../data/repositories';
import { useProfileStore } from '../../state/profileStore';
import type {
  CareTask,
  JournalEntry,
  PlantSpecies,
  Pot,
  Site,
} from '../../domain/types';
import { t } from '../../i18n';
import { CareTab } from './tabs/CareTab';
import { JournalTab } from './tabs/JournalTab';
import { InfoTab } from './tabs/InfoTab';
import { renamePot } from './actions';

type Tab = 'care' | 'journal' | 'info';

export function PlantDetailScreen() {
  const { potId } = useParams<{ potId: string }>();
  const skill = useProfileStore((s) => s.profile?.skill_level ?? 'beginner');

  const [pot, setPot] = useState<Pot | null>(null);
  const [species, setSpecies] = useState<PlantSpecies | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('care');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!potId) return;
    const p = await potsRepo.getById(potId);
    if (!p) {
      setNotFound(true);
      return;
    }
    const [sp, t, j] = await Promise.all([
      speciesRepo.getById(p.species_id),
      careTasksRepo.listByPot(p.id),
      journalRepo.listByPot(p.id),
    ]);
    setPot(p);
    setSpecies(sp ?? null);
    setTasks(t);
    setEntries(j);
    setNameDraft(p.display_name);
    if (p.site_id) {
      const sites = await sitesRepo.listAll();
      setSite(sites.find((x) => x.id === p.site_id) ?? null);
    } else {
      setSite(null);
    }
    if (p.photo_blob_id) {
      setPhotoUrl(await imagesRepo.objectUrl(p.photo_blob_id));
    } else {
      setPhotoUrl(null);
    }
  }, [potId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (notFound) {
    return (
      <main className="mx-auto max-w-md p-6">
        <NavLink to="/plants" className="text-sm text-primary underline">
          {t('plantDetail.back')}
        </NavLink>
        <p className="mt-6 text-center text-ink-muted">
          {t('plantDetail.deleted')}
        </p>
      </main>
    );
  }

  if (!pot) {
    return <main className="p-6 text-ink-muted">{t('common.loading')}</main>;
  }

  async function saveName() {
    if (!pot) return;
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === pot.display_name) {
      setEditingName(false);
      setNameDraft(pot.display_name);
      return;
    }
    await renamePot(pot.id, trimmed);
    setEditingName(false);
    await load();
  }

  return (
    <main className="mx-auto max-w-md pb-12">
      <div className="relative">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt=""
            className="h-56 w-full object-cover"
          />
        ) : (
          <div className="flex h-56 w-full items-center justify-center bg-primary/10 text-6xl">
            🪴
          </div>
        )}
        <NavLink
          to="/plants"
          className="absolute left-3 top-3 rounded-full bg-card/90 px-3 py-1 text-sm text-ink shadow-sm backdrop-blur"
        >
          {t('addPlant.back')}
        </NavLink>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {editingName ? (
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void saveName();
                  if (e.key === 'Escape') {
                    setEditingName(false);
                    setNameDraft(pot.display_name);
                  }
                }}
                maxLength={60}
                className="w-full rounded-lg border border-primary/30 bg-card px-2 py-1 font-display text-xl font-semibold outline-none focus:border-primary"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="text-left"
              >
                <h1 className="font-display text-2xl font-semibold text-ink">
                  {pot.display_name}
                  <span className="ml-2 text-xs text-ink-muted">✏️</span>
                </h1>
              </button>
            )}
            <p className="text-sm italic text-ink-muted">
              {species?.common_name}
              {species && ` · ${species.scientific_name}`}
            </p>
          </div>
          {site && (
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
              {site.icon} {site.name}
            </span>
          )}
        </div>

        <div className="mt-4 flex gap-1 rounded-full border border-black/10 bg-card p-1">
          <TabBtn active={tab === 'care'} onClick={() => setTab('care')}>
            {t('plantDetail.tab.care')}
          </TabBtn>
          <TabBtn
            active={tab === 'journal'}
            onClick={() => setTab('journal')}
          >
            {t('plantDetail.tab.journal')}
          </TabBtn>
          <TabBtn active={tab === 'info'} onClick={() => setTab('info')}>
            {t('plantDetail.tab.info')}
          </TabBtn>
        </div>

        <div className="mt-4">
          {tab === 'care' && (
            <CareTab
              potId={pot.id}
              tasks={tasks}
              species={species}
              skill={skill}
              onMutated={load}
            />
          )}
          {tab === 'journal' && (
            <JournalTab potId={pot.id} entries={entries} onMutated={load} />
          )}
          {tab === 'info' && <InfoTab pot={pot} species={species} />}
        </div>
      </div>
    </main>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-full py-2 text-sm transition ${
        active ? 'bg-primary text-white' : 'text-ink-muted'
      }`}
    >
      {children}
    </button>
  );
}
