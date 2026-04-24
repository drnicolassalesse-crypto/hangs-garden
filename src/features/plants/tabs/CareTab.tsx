import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import type {
  ActionType,
  CareTask,
  PlantSpecies,
  SkillLevel,
  UUID,
} from '../../../domain/types';
import {
  careLogsRepo,
  fertilizersRepo,
} from '../../../data/repositories';
import { pickLastFertilizerId } from '../../../domain/fertilizers';
import { t, getLocale } from '../../../i18n';
import { TaskDetailSheet } from '../TaskDetailSheet';
import { toggleTaskEnabled } from '../actions';

function actionMeta(action: ActionType): { emoji: string; label: string } {
  return {
    emoji: t(`action.${action}.emoji`),
    label: t(`action.${action}`),
  };
}

const ORDER: ActionType[] = [
  'watering',
  'fertilizing',
  'misting',
  'repotting',
  'pruning',
  'cleaning',
];

function formatDate(ts: number | null): string {
  if (ts === null) return t('common.never');
  return new Date(ts).toLocaleDateString(getLocale(), {
    month: 'short',
    day: 'numeric',
  });
}

export function CareTab({
  potId,
  tasks,
  species,
  skill,
  onMutated,
}: {
  potId: UUID;
  tasks: CareTask[];
  species: PlantSpecies | null;
  skill: SkillLevel;
  onMutated: () => void;
}) {
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [lastFertilizerName, setLastFertilizerName] = useState<string | null>(
    null,
  );
  const sorted = [...tasks].sort(
    (a, b) => ORDER.indexOf(a.action_type) - ORDER.indexOf(b.action_type),
  );
  const open = tasks.find((t) => t.id === openTaskId) ?? null;

  useEffect(() => {
    void (async () => {
      const logs = await careLogsRepo.listByPot(potId);
      const id = pickLastFertilizerId(logs);
      if (!id) {
        setLastFertilizerName(null);
        return;
      }
      const f = await fertilizersRepo.getById(id);
      setLastFertilizerName(f?.name ?? null);
    })();
  }, [potId, tasks]);

  async function handleToggle(t: CareTask, enabled: boolean) {
    await toggleTaskEnabled(t.id, enabled);
    onMutated();
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {sorted.map((task) => {
          const meta = actionMeta(task.action_type);
          return (
            <li
              key={task.id}
              className={`flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm ${
                task.is_enabled ? '' : 'opacity-60'
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenTaskId(task.id)}
                className="flex flex-1 items-center gap-3 text-left"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-xl">
                  {meta.emoji}
                </div>
                <div className="min-w-0">
                  <div className="font-medium">{meta.label}</div>
                  <div className="text-xs text-ink-muted">
                    {t('care.everyD', { days: task.interval_days })} · {t('care.last', { date: formatDate(task.last_performed_at) })}
                    {' · '}
                    {t('care.next', { date: formatDate(task.next_due_at) })}
                  </div>
                  {task.action_type === 'fertilizing' && lastFertilizerName && (
                    <div className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                      {t('care.lastFertilizer', { name: lastFertilizerName })}
                    </div>
                  )}
                </div>
              </button>
              <Toggle
                enabled={task.is_enabled}
                onChange={(v) => handleToggle(task, v)}
              />
            </li>
          );
        })}
      </ul>

      <NavLink
        to="schedule"
        relative="path"
        className="mt-2 block rounded-full border border-dashed border-primary/40 px-4 py-2 text-center text-sm text-primary"
      >
        {t('care.editSchedule')}
      </NavLink>

      {open && (
        <TaskDetailSheet
          task={open}
          species={species}
          skill={skill}
          onClose={() => setOpenTaskId(null)}
          onMutated={onMutated}
        />
      )}
    </div>
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
      className={`relative h-6 w-10 rounded-full transition ${
        enabled ? 'bg-primary' : 'bg-black/15'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
          enabled ? 'left-[18px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}
