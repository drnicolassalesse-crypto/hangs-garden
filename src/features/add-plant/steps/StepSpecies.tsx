import { useEffect, useMemo, useState } from 'react';
import { speciesRepo } from '../../../data/repositories';
import { TextInput } from '../../../ui/Field';
import { t } from '../../../i18n';
import type { PlantSpecies } from '../../../domain/types';

export function StepSpecies({
  onPick,
}: {
  onPick: (s: PlantSpecies) => void;
}) {
  const [all, setAll] = useState<PlantSpecies[] | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    speciesRepo.listAll().then(setAll);
  }, []);

  const filtered = useMemo(() => {
    if (!all) return null;
    const term = q.trim().toLowerCase();
    if (!term) return all;
    return all.filter((s) => {
      const haystacks = [
        s.common_name,
        s.scientific_name,
        ...s.tags.filter((tag) => tag.startsWith('vi_name:')).map((tag) => tag.slice(8)),
      ];
      return haystacks.some((h) => h.toLowerCase().includes(term));
    });
  }, [all, q]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-2xl font-semibold text-ink">
          {t('addPlant.species.heading')}
        </h2>
        <p className="text-sm text-ink-muted">
          {t('addPlant.species.hint')}
        </p>
      </div>
      <TextInput
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t('addPlant.species.placeholder')}
        autoFocus
      />
      <div className="flex justify-end">
        <a
          href="/species/new"
          className="text-xs text-primary underline"
        >
          {t('addPlant.species.addCustom')}
        </a>
      </div>
      {filtered === null ? (
        <p className="text-ink-muted">{t('common.loading')}</p>
      ) : filtered.length === 0 ? (
        <p className="text-ink-muted">{t('addPlant.species.noMatch', { query: q })}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => onPick(s)}
                className="w-full rounded-2xl border border-black/10 bg-card p-4 text-left transition hover:border-primary/40"
              >
                <div className="font-medium">
                  {s.common_name}
                  <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-normal text-primary">
                    {s.difficulty}
                  </span>
                </div>
                <div className="text-sm italic text-ink-muted">
                  {s.scientific_name}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
