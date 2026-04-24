import { useEffect, useState } from 'react';
import {
  careLogsRepo,
  fertilizersRepo,
} from '../../data/repositories';
import {
  completeTask,
  skipTask,
  snoozeTask,
} from '../today/actions';
import { pickLastFertilizerId } from '../../domain/fertilizers';
import { FertilizerPicker } from '../fertilizers/FertilizerPicker';
import { t, tp, getLocale } from '../../i18n';
import type {
  ActionType,
  CareLog,
  CareTask,
  PlantSpecies,
  SkillLevel,
  UUID,
} from '../../domain/types';

function actionMeta(action: ActionType): { emoji: string; label: string } {
  return {
    emoji: t(`action.${action}.emoji`),
    label: t(`action.${action}`),
  };
}

const DAY = 24 * 60 * 60 * 1000;

function careInstructions(
  species: PlantSpecies,
  action: ActionType,
  skill: SkillLevel,
): string {
  // Task 7.2 from the spec (per-skill, per-action) is future work.
  // For now pick a reasonable summary sourced from the species record.
  if (skill === 'expert') {
    const days = species.care_defaults[
      (`${action}_interval_days`) as keyof typeof species.care_defaults
    ];
    return `${t(`action.${action}`)} ${tp('common.everyDays', Number(days))}.`;
  }
  return species.description;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(getLocale(), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function TaskDetailSheet({
  task,
  species,
  skill,
  onClose,
  onMutated,
}: {
  task: CareTask;
  species: PlantSpecies | null;
  skill: SkillLevel;
  onClose: () => void;
  onMutated: () => void;
}) {
  const [logs, setLogs] = useState<CareLog[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [fertilizerPickerOpen, setFertilizerPickerOpen] = useState(false);
  const [preselectFertilizer, setPreselectFertilizer] = useState<UUID | null>(
    null,
  );
  const meta = actionMeta(task.action_type);

  useEffect(() => {
    careLogsRepo.listByTask(task.id).then(setLogs);
  }, [task.id]);

  async function runAndClose(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
      onMutated();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function onDone() {
    if (task.action_type !== 'fertilizing') {
      return runAndClose(() => completeTask(task.id));
    }
    const count = (await fertilizersRepo.listAll()).length;
    if (count === 0) {
      return runAndClose(() => completeTask(task.id));
    }
    const potLogs = await careLogsRepo.listByPot(task.pot_id);
    setPreselectFertilizer(pickLastFertilizerId(potLogs));
    setFertilizerPickerOpen(true);
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-3xl bg-card p-5 pb-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-black/10" />

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl">
            {meta.emoji}
          </div>
          <div>
            <h2 className="text-lg font-semibold">{meta.label}</h2>
            <p className="text-xs text-ink-muted">
              {tp('common.everyDays', task.interval_days)}
            </p>
          </div>
        </div>

        {species && (
          <p className="mt-3 text-sm text-ink-muted">
            {careInstructions(species, task.action_type, skill)}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <Cell
            label={t('taskDetail.lastPerformed')}
            value={
              task.last_performed_at
                ? formatDate(task.last_performed_at)
                : t('common.never')
            }
          />
          <Cell label={t('taskDetail.nextDue')} value={formatDate(task.next_due_at)} />
        </div>

        <div className="mt-5 flex gap-2">
          <button
            disabled={busy}
            onClick={onDone}
            className="flex-1 rounded-full bg-primary px-4 py-3 text-white disabled:opacity-60"
          >
            {t('task.done')}
          </button>
          <div className="relative">
            <button
              disabled={busy}
              onClick={() => setSnoozeOpen((s) => !s)}
              className="rounded-full border border-black/10 px-4 py-3 text-ink"
            >
              {t('task.snooze')}
            </button>
            {snoozeOpen && (
              <div className="absolute bottom-full right-0 mb-1 flex gap-1 rounded-xl border border-black/10 bg-card p-1 shadow-lg">
                {[1, 2, 3].map((d) => (
                  <button
                    key={d}
                    onClick={() =>
                      runAndClose(() =>
                        snoozeTask(task.id, Date.now() + d * DAY),
                      )
                    }
                    className="rounded-lg px-3 py-1.5 text-sm hover:bg-primary/10"
                  >
                    +{d}{t('common.dSuffix')}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            disabled={busy}
            onClick={() => {
              if (window.confirm(t('task.confirmSkip'))) {
                void runAndClose(() => skipTask(task.id));
              }
            }}
            className="rounded-full px-4 py-3 text-sm text-ink-muted"
          >
            {t('task.skip')}
          </button>
        </div>

        <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {t('taskDetail.history')}
        </h3>
        {logs === null ? (
          <p className="text-sm text-ink-muted">{t('common.loading')}</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-ink-muted">{t('taskDetail.noHistory')}</p>
        ) : (
          <ul className="max-h-48 overflow-auto text-sm">
            {logs.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between border-b border-black/5 py-1.5 last:border-b-0"
              >
                <span className="capitalize">{l.action}</span>
                <span className="text-ink-muted">
                  {formatDate(l.performed_at)}
                </span>
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-full border border-black/10 py-2 text-sm text-ink-muted"
        >
          {t('common.close')}
        </button>
      </div>

      {fertilizerPickerOpen && (
        <FertilizerPicker
          preselectId={preselectFertilizer}
          onCancel={() => setFertilizerPickerOpen(false)}
          onPick={(id) => {
            setFertilizerPickerOpen(false);
            void runAndClose(() => completeTask(task.id, id));
          }}
        />
      )}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-ink-muted">
        {label}
      </div>
      <div className="text-sm text-ink">{value}</div>
    </div>
  );
}
