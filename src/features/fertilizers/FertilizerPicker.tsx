import { useEffect, useState } from 'react';
import { fertilizersRepo, imagesRepo } from '../../data/repositories';
import type { Fertilizer, UUID } from '../../domain/types';
import { t } from '../../i18n';

export function FertilizerPicker({
  preselectId,
  onPick,
  onCancel,
}: {
  preselectId: UUID | null;
  onPick: (id: UUID | null) => void;
  onCancel: () => void;
}) {
  const [fertilizers, setFertilizers] = useState<Fertilizer[] | null>(null);
  const [thumbs, setThumbs] = useState<Record<UUID, string | null>>({});
  const [selected, setSelected] = useState<UUID | null>(preselectId);

  useEffect(() => {
    void (async () => {
      const all = await fertilizersRepo.listAll();
      setFertilizers(all);
      const urls: [UUID, string | null][] = await Promise.all(
        all
          .filter((f) => f.photo_blob_id)
          .map(async (f) => [
            f.id,
            await imagesRepo.objectUrl(f.photo_blob_id as UUID),
          ]),
      );
      setThumbs(Object.fromEntries(urls));
    })();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/40"
      onClick={onCancel}
    >
      <div
        className="max-h-[85dvh] w-full overflow-auto rounded-t-3xl bg-card p-5 pb-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-black/10" />
        <h2 className="font-display text-lg font-semibold">
          {t('fertilizerPicker.heading')}
        </h2>
        <p className="text-xs text-ink-muted">
          {t('fertilizerPicker.hint')}
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <PickRow
            active={selected === null}
            onClick={() => setSelected(null)}
            title={t('fertilizerPicker.skip')}
            subtitle={t('fertilizerPicker.skip.desc')}
          />
          {fertilizers === null ? (
            <p className="py-4 text-center text-sm text-ink-muted">
              {t('common.loading')}
            </p>
          ) : fertilizers.length === 0 ? (
            <a
              href="/fertilizers/new"
              className="rounded-2xl border-2 border-dashed border-primary/40 p-4 text-center text-sm text-primary"
            >
              {t('fertilizerPicker.addFirst')}
            </a>
          ) : (
            fertilizers.map((f) => (
              <PickRow
                key={f.id}
                active={selected === f.id}
                onClick={() => setSelected(f.id)}
                title={f.name}
                subtitle={[t('fertilizers.' + f.type), f.npk]
                  .filter(Boolean)
                  .join(' · ')}
                thumb={thumbs[f.id] ?? null}
              />
            ))
          )}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-black/10 px-4 py-3 text-sm text-ink"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => onPick(selected)}
            className="flex-1 rounded-full bg-primary px-4 py-3 text-sm text-white"
          >
            {t('fertilizerPicker.markDone')}
          </button>
        </div>
      </div>
    </div>
  );
}

function PickRow({
  active,
  onClick,
  title,
  subtitle,
  thumb,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  thumb?: string | null;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${
        active ? 'border-primary bg-primary/5' : 'border-black/10 bg-card'
      }`}
    >
      {thumb ? (
        <img
          src={thumb}
          alt=""
          className="h-12 w-12 rounded-xl object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-xl">
          🌿
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{title}</div>
        {subtitle && (
          <div className="truncate text-xs text-ink-muted">{subtitle}</div>
        )}
      </div>
      {active && <span className="text-primary">✓</span>}
    </button>
  );
}
