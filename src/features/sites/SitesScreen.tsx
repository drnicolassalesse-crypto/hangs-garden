import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { potsRepo, sitesRepo } from '../../data/repositories';
import type { Site } from '../../domain/types';
import { Button } from '../../ui/Button';
import { TextInput } from '../../ui/Field';
import { t, tp } from '../../i18n';

const ICON_CHOICES = ['🌿', '🪴', '🏡', '🍳', '🛋️', '🛏️', '🚿', '🌞', '🪟', '🌷'];

export function SitesScreen() {
  const [sites, setSites] = useState<Site[] | null>(null);
  const [countsBySite, setCountsBySite] = useState<Record<string, number>>({});
  const [composing, setComposing] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('🌿');

  async function load() {
    const [s, pots] = await Promise.all([
      sitesRepo.listAll(),
      potsRepo.listAll(),
    ]);
    setSites(s);
    const counts: Record<string, number> = {};
    for (const p of pots) {
      if (p.site_id) counts[p.site_id] = (counts[p.site_id] ?? 0) + 1;
    }
    setCountsBySite(counts);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    const name = newName.trim();
    if (!name) return;
    await sitesRepo.create({ name, icon: newIcon });
    setNewName('');
    setNewIcon('🌿');
    setComposing(false);
    await load();
  }

  return (
    <main className="mx-auto max-w-md p-4 pb-12">
      <header className="mb-4 flex items-center justify-between">
        <NavLink to="/" className="text-sm text-primary underline">
          {t('sites.back')}
        </NavLink>
        <h1 className="font-display text-xl font-bold text-primary">
          {sites ? t('sites.headingCount', { count: sites.length }) : t('sites.heading')}
        </h1>
        <span className="w-14" />
      </header>

      {sites === null ? (
        <p className="text-ink-muted">{t('common.loading')}</p>
      ) : sites.length === 0 && !composing ? (
        <EmptyState onAdd={() => setComposing(true)} />
      ) : (
        <ul className="flex flex-col gap-2">
          {sites.map((s) => (
            <li key={s.id}>
              <NavLink
                to={`/sites/${s.id}`}
                className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm transition active:scale-[0.98]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-xl">
                  {s.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{s.name}</div>
                  <div className="text-xs text-ink-muted">
                    {tp('common.pot', countsBySite[s.id] ?? 0)}
                  </div>
                </div>
                <span className="text-ink-muted">›</span>
              </NavLink>
            </li>
          ))}
        </ul>
      )}

      {composing ? (
        <div className="mt-4 rounded-2xl bg-card p-4 shadow-sm">
          <div className="mb-2 text-sm font-medium">{t('sites.newSite')}</div>
          <div className="flex flex-wrap gap-1.5 pb-2">
            {ICON_CHOICES.map((ico) => (
              <button
                key={ico}
                type="button"
                onClick={() => setNewIcon(ico)}
                className={`h-9 w-9 rounded-lg text-lg transition ${
                  newIcon === ico
                    ? 'bg-primary/15 ring-2 ring-primary'
                    : 'bg-surface'
                }`}
              >
                {ico}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <TextInput
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value.slice(0, 2))}
              maxLength={2}
              className="w-16 text-center"
            />
            <TextInput
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('sites.placeholder')}
              className="flex-1"
              autoFocus
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" onClick={() => setComposing(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              className="flex-1"
              disabled={!newName.trim()}
              onClick={create}
            >
              {t('common.create')}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setComposing(true)}
          className="mt-4 w-full rounded-full border border-dashed border-primary/40 px-4 py-3 text-primary"
        >
          {t('sites.addSite')}
        </button>
      )}
    </main>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-black/10 p-8 text-center">
      <div className="mb-2 text-4xl">🏡</div>
      <p className="mb-1 text-ink-muted">{t('sites.empty.title')}</p>
      <p className="mb-3 text-xs text-ink-muted">
        {t('sites.empty.body')}
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="rounded-full bg-primary px-4 py-2 text-sm text-white"
      >
        {t('sites.addSite')}
      </button>
    </div>
  );
}
