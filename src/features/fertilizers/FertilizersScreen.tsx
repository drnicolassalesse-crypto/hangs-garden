import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { fertilizersRepo, imagesRepo } from '../../data/repositories';
import type { Fertilizer, UUID } from '../../domain/types';
import { t } from '../../i18n';

export function FertilizersScreen() {
  const [items, setItems] = useState<Fertilizer[] | null>(null);
  const [thumbs, setThumbs] = useState<Record<UUID, string | null>>({});

  useEffect(() => {
    void (async () => {
      const all = await fertilizersRepo.listAll();
      setItems(all);
      const entries: [UUID, string | null][] = await Promise.all(
        all
          .filter((f) => f.photo_blob_id)
          .map(async (f) => [
            f.id,
            await imagesRepo.objectUrl(f.photo_blob_id as UUID),
          ]),
      );
      setThumbs(Object.fromEntries(entries));
    })();
  }, []);

  return (
    <main className="mx-auto max-w-md p-4 pb-12">
      <header className="mb-4 flex items-center justify-between">
        <NavLink to="/settings" className="text-sm text-primary underline">
          {t('fertilizers.back')}
        </NavLink>
        <h1 className="font-display text-xl font-bold text-primary">
          {t('fertilizers.heading')}
        </h1>
        <NavLink
          to="/fertilizers/new"
          className="rounded-full bg-primary px-3 py-1 text-sm text-white"
        >
          {t('fertilizers.addNew')}
        </NavLink>
      </header>

      {items === null ? (
        <p className="text-ink-muted">{t('common.loading')}</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-black/10 p-8 text-center">
          <div className="mb-2 text-4xl">🧪</div>
          <p className="mb-3 text-ink-muted">{t('fertilizers.empty.title')}</p>
          <p className="mb-3 text-xs text-ink-muted">
            {t('fertilizers.empty.body')}
          </p>
          <NavLink
            to="/fertilizers/new"
            className="rounded-full bg-primary px-4 py-2 text-sm text-white"
          >
            {t('fertilizers.empty.cta')}
          </NavLink>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((f) => (
            <li key={f.id}>
              <NavLink
                to={`/fertilizers/${f.id}/edit`}
                className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm"
              >
                {thumbs[f.id] ? (
                  <img
                    src={thumbs[f.id] as string}
                    alt=""
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-2xl">
                    🌿
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{f.name}</div>
                  <div className="flex flex-wrap gap-1 text-xs text-ink-muted">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                      {t('fertilizers.' + f.type)}
                    </span>
                    {f.npk && <span>{t('fertilizers.npk', { value: f.npk })}</span>}
                  </div>
                </div>
                <span className="text-ink-muted">›</span>
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
