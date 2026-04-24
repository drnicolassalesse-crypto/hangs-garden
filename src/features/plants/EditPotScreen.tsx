import { useCallback, useEffect, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import {
  careTasksRepo,
  potsRepo,
  sitesRepo,
  speciesRepo,
} from '../../data/repositories';
import type {
  CareTask,
  PlantSpecies,
  Pot,
  Site,
} from '../../domain/types';
import { StepPotDetails } from '../add-plant/steps/StepPotDetails';
import { StepLightLocation } from '../add-plant/steps/StepLightLocation';
import type { AddPlantDraft } from '../add-plant/draft';
import { t } from '../../i18n';
import { Button } from '../../ui/Button';
import { Field } from '../../ui/Field';
import { updatePotParams } from './editActions';

function draftFromPot(pot: Pot): AddPlantDraft {
  return {
    species_id: pot.species_id,
    display_name: pot.display_name,
    photo_blob_id: pot.photo_blob_id,
    site_id: pot.site_id,
    pot_size: pot.pot_size,
    pot_material: pot.pot_material,
    soil_type: pot.soil_type,
    light_level: pot.light_level,
    location_type: pot.location_type,
    notes: pot.notes,
    last_watered_at: null,
    last_fertilized_at: null,
  };
}

export function EditPotScreen() {
  const { potId } = useParams<{ potId: string }>();
  const navigate = useNavigate();

  const [pot, setPot] = useState<Pot | null>(null);
  const [species, setSpecies] = useState<PlantSpecies | null>(null);
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [draft, setDraft] = useState<AddPlantDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!potId) return;
    const p = await potsRepo.getById(potId);
    if (!p) {
      navigate('/plants');
      return;
    }
    const [sp, t, si] = await Promise.all([
      speciesRepo.getById(p.species_id),
      careTasksRepo.listByPot(p.id),
      sitesRepo.listAll(),
    ]);
    setPot(p);
    setSpecies(sp ?? null);
    setTasks(t);
    setSites(si);
    setDraft(draftFromPot(p));
  }, [potId, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!pot || !species || !draft) {
    return <main className="p-6 text-ink-muted">{t('common.loading')}</main>;
  }

  function patch(p: Partial<AddPlantDraft>) {
    setDraft((d) => (d ? { ...d, ...p } : d));
  }

  async function save() {
    if (!pot || !species || !draft) return;
    setSaving(true);
    try {
      const updatedPot: Pot = {
        ...pot,
        site_id: draft.site_id,
        pot_size: draft.pot_size,
        pot_material: draft.pot_material,
        soil_type: draft.soil_type,
        light_level: draft.light_level,
        location_type: draft.location_type,
      };
      await updatePotParams({ updatedPot, species, tasks });
      navigate(`/plants/${pot.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-4 pb-24">
      <header className="mb-4 flex items-center justify-between">
        <NavLink to={`/plants/${pot.id}`} className="text-sm text-primary underline">
          ← {pot.display_name}
        </NavLink>
        <h1 className="font-display text-lg font-semibold text-primary">
          {t('editPot.heading')}
        </h1>
        <span />
      </header>

      {pot.use_custom_schedule && (
        <div className="mb-4 rounded-xl bg-warning/10 p-3 text-xs text-ink">
          {t('editPot.customWarning')}
        </div>
      )}

      <div className="flex flex-col gap-6">
        <Field label={t('editPot.site')}>
          <div className="flex flex-wrap gap-2">
            <Chip
              selected={draft.site_id === null}
              icon="—"
              label={t('common.none')}
              onClick={() => patch({ site_id: null })}
            />
            {sites.map((s) => (
              <Chip
                key={s.id}
                selected={draft.site_id === s.id}
                icon={s.icon}
                label={s.name}
                onClick={() => patch({ site_id: s.id })}
              />
            ))}
          </div>
        </Field>

        <StepPotDetails draft={draft} onChange={patch} />
        <StepLightLocation draft={draft} onChange={patch} />
      </div>

      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-black/5 bg-surface/90 p-4 backdrop-blur">
        <Button className="w-full" disabled={saving} onClick={save}>
          {saving ? t('common.saving') : t('common.saveChanges')}
        </Button>
      </div>
    </main>
  );
}

function Chip({
  selected,
  icon,
  label,
  onClick,
}: {
  selected: boolean;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm transition ${
        selected
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-black/10 bg-card text-ink hover:border-primary/40'
      }`}
    >
      <span className="mr-1">{icon}</span>
      {label}
    </button>
  );
}
