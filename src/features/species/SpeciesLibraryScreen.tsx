import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { imagesRepo, speciesRepo } from '../../data/repositories';
import type { PlantSpecies, UUID } from '../../domain/types';
import { t } from '../../i18n';

export function SpeciesLibraryScreen() {
  const [species, setSpecies] = useState<PlantSpecies[] | null>(null);
  const [q, setQ] = useState('');
  const [thumbs, setThumbs] = useState<Record<UUID, string | null>>({});

  useEffect(() => {
    void (async () => {
      const all = await speciesRepo.listAll();
      setSpecies(all);
      const entries: [UUID, string | null][] = await Promise.all(
        all
          .filter((s) => s.image_blob_id)
          .map(async (s) => [
            s.id,
            await imagesRepo.objectUrl(s.image_blob_id as UUID),
          ]),
      );
      setThumbs(Object.fromEntries(entries));
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!species) return null;
    const term = q.trim().toLowerCase();
    const sorted = [...species].sort((a, b) =>
      a.common_name.localeCompare(b.common_name, undefined, {
        sensitivity: 'base',
      }),
    );
    if (!term) return sorted;
    return sorted.filter((s) => {
      const vi = s.tags
        .filter((t) => t.startsWith('vi_name:'))
        .map((t) => t.slice(8));
      const hay = [s.common_name, s.scientific_name, s.family, ...vi];
      return hay.some((h) => h.toLowerCase().includes(term));
    });
  }, [species, q]);

  return (
    <main className="mx-auto max-w-md p-4 pb-12">
      <header className="mb-4 flex items-center justify-between">
        <NavLink to="/" className="text-sm text-primary underline">
          {t('species.back')}
        </NavLink>
        <h1 className="font-display text-xl font-bold text-primary">
          {t('species.heading')}
        </h1>
        <NavLink
          to="/species/new"
          className="rounded-full bg-primary px-3 py-1 text-sm text-white"
        >
          {t('species.addCustom')}
        </NavLink>
      </header>

      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t('species.search')}
        className="mb-3 w-full rounded-xl border border-black/10 bg-card px-4 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />

      {filtered === null ? (
        <p className="text-ink-muted">{t('common.loading')}</p>
      ) : filtered.length === 0 ? (
        <p className="py-6 text-center text-ink-muted">{t('species.noMatch')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((s) => {
            const url = thumbs[s.id] ?? null;
            return (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm"
              >
                {url ? (
                  <img
                    src={url}
                    alt=""
                    className="h-12 w-12 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-xl">
                    {s.is_custom ? '🌱' : '🌿'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate font-medium">{s.common_name}</div>
                    {s.is_custom && (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                        {t('species.custom')}
                      </span>
                    )}
                  </div>
                  {s.scientific_name && (
                    <div className="truncate text-xs italic text-ink-muted">
                      {s.scientific_name}
                    </div>
                  )}
                </div>
                {s.is_custom && (
                  <NavLink
                    to={`/species/${s.id}/edit`}
                    className="rounded-full px-2 py-1 text-sm text-primary hover:bg-primary/10"
                    aria-label="Edit"
                  >
                    ✏️
                  </NavLink>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
