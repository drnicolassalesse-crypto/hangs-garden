import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import {
  careTasksRepo,
  potsRepo,
  speciesRepo,
} from '../../data/repositories';
import { computeCalculatedInterval } from '../../domain/schedule';
import type {
  ActionType,
  CareTask,
  PlantSpecies,
  Pot,
} from '../../domain/types';
import { t, tp } from '../../i18n';
import { Button } from '../../ui/Button';
import { saveCustomSchedule, type CustomScheduleInput } from './editActions';

const ACTIONS: ActionType[] = [
  'watering',
  'fertilizing',
  'misting',
  'repotting',
  'pruning',
  'cleaning',
];

function valuesFromPot(
  pot: Pot,
  species: PlantSpecies,
): CustomScheduleInput {
  if (pot.use_custom_schedule && pot.custom_schedule) {
    return { ...pot.custom_schedule };
  }
  return {
    watering_interval_days: computeCalculatedInterval('watering', species, pot),
    fertilizing_interval_days: computeCalculatedInterval(
      'fertilizing',
      species,
      pot,
    ),
    misting_interval_days: computeCalculatedInterval('misting', species, pot),
    repotting_interval_days: computeCalculatedInterval(
      'repotting',
      species,
      pot,
    ),
    pruning_interval_days: computeCalculatedInterval('pruning', species, pot),
    cleaning_interval_days: computeCalculatedInterval('cleaning', species, pot),
  };
}

export function CustomScheduleScreen() {
  const { potId } = useParams<{ potId: string }>();
  const navigate = useNavigate();

  const [pot, setPot] = useState<Pot | null>(null);
  const [species, setSpecies] = useState<PlantSpecies | null>(null);
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [values, setValues] = useState<CustomScheduleInput | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!potId) return;
    const p = await potsRepo.getById(potId);
    if (!p) {
      navigate('/plants');
      return;
    }
    const [sp, tks] = await Promise.all([
      speciesRepo.getById(p.species_id),
      careTasksRepo.listByPot(p.id),
    ]);
    setPot(p);
    setSpecies(sp ?? null);
    setTasks(tks);
    setEnabled(p.use_custom_schedule);
    if (sp) setValues(valuesFromPot(p, sp));
  }, [potId, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const calculated = useMemo(() => {
    if (!pot || !species) return null;
    return valuesFromPot({ ...pot, use_custom_schedule: false }, species);
  }, [pot, species]);

  if (!pot || !species || !values) {
    return <main className="p-6 text-ink-muted">{t('common.loading')}</main>;
  }

  function updateValue(action: ActionType, v: string) {
    const n = Number(v);
    const num = Number.isFinite(n) && n > 0 ? Math.round(n) : null;
    setValues((prev) =>
      prev
        ? {
            ...prev,
            [`${action}_interval_days`]: num,
          }
        : prev,
    );
  }

  async function save() {
    if (!pot || !species || !values) return;
    setSaving(true);
    try {
      await saveCustomSchedule({ pot, species, tasks, enabled, values });
      navigate(`/plants/${pot.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-md p-4 pb-24">
      <header className="mb-4 flex items-center justify-between">
        <NavLink
          to={`/plants/${pot.id}`}
          className="text-sm text-primary underline"
        >
          ← {pot.display_name}
        </NavLink>
        <h1 className="font-display text-lg font-semibold text-primary">
          {t('schedule.heading')}
        </h1>
        <span />
      </header>

      <div className="mb-4 flex items-center justify-between rounded-2xl bg-card p-4 shadow-sm">
        <div>
          <div className="font-medium">{t('schedule.useCustom')}</div>
          <p className="text-xs text-ink-muted">
            {t('schedule.customHint')}
          </p>
        </div>
        <Toggle enabled={enabled} onChange={setEnabled} />
      </div>

      <ul className="flex flex-col gap-2">
        {ACTIONS.map((action) => {
          const key = `${action}_interval_days` as keyof CustomScheduleInput;
          const current = values[key];
          const calc = calculated ? calculated[key] : null;
          return (
            <li
              key={action}
              className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-xl">
                {t(`action.${action}.emoji`)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{t(`action.${action}`)}</div>
                <div className="text-xs text-ink-muted">
                  {calc != null ? tp('schedule.autoEvery', calc) : '—'}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  disabled={!enabled}
                  value={current ?? ''}
                  onChange={(e) => updateValue(action, e.target.value)}
                  placeholder={String(calc ?? '')}
                  className={`w-16 rounded-lg border border-black/10 bg-card px-2 py-1.5 text-right text-sm outline-none focus:border-primary ${
                    !enabled ? 'opacity-50' : ''
                  }`}
                />
                <span className="text-xs text-ink-muted">{t('common.dSuffix')}</span>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-xs text-ink-muted">
        {t('schedule.saveHint')}
      </p>

      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-black/5 bg-surface/90 p-4 backdrop-blur">
        <Button className="w-full" disabled={saving} onClick={save}>
          {saving ? t('common.saving') : t('schedule.save')}
        </Button>
      </div>
    </main>
  );
}

function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={`relative h-7 w-12 rounded-full transition ${
        enabled ? 'bg-primary' : 'bg-black/15'
      }`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
          enabled ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}
