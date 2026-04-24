import { useState } from 'react';
import { dueLabel, type TodayRow } from '../../domain/todayView';
import type { ActionType, UUID } from '../../domain/types';
import { careLogsRepo, fertilizersRepo } from '../../data/repositories';
import { pickLastFertilizerId } from '../../domain/fertilizers';
import { FertilizerPicker } from '../fertilizers/FertilizerPicker';
import { t } from '../../i18n';

function actionEmoji(type: ActionType): string {
  return t(`action.${type}.emoji`);
}
function actionLabel(type: ActionType): string {
  return t(`action.${type}`);
}

const DAY = 24 * 60 * 60 * 1000;

export function TaskCard({
  row,
  now,
  onComplete,
  onSkip,
  onSnooze,
}: {
  row: TodayRow;
  now: number;
  onComplete: (fertilizerId: UUID | null) => void;
  onSkip: () => void;
  onSnooze: (untilTs: number) => void;
}) {
  const [snoozing, setSnoozing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [preselect, setPreselect] = useState<UUID | null>(null);
  const emoji = actionEmoji(row.task.action_type);
  const label = actionLabel(row.task.action_type);

  const accent =
    row.bucket === 'overdue'
      ? 'border-l-overdue'
      : row.bucket === 'today'
        ? 'border-l-success'
        : 'border-l-black/10';

  async function handleDone() {
    if (row.task.action_type !== 'fertilizing') {
      onComplete(null);
      return;
    }
    const count = (await fertilizersRepo.listAll()).length;
    if (count === 0) {
      onComplete(null);
      return;
    }
    const logs = await careLogsRepo.listByPot(row.pot.id);
    setPreselect(pickLastFertilizerId(logs));
    setPickerOpen(true);
  }

  function confirmSkip() {
    if (typeof window !== 'undefined' && !window.confirm(t('task.confirmSkip'))) {
      return;
    }
    onSkip();
  }

  function snoozeDays(days: number) {
    onSnooze(now + days * DAY);
    setSnoozing(false);
  }

  return (
    <div
      className={`rounded-2xl border-l-4 bg-card p-4 shadow-sm ${accent}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl">
          {emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <div className="font-medium text-ink">{label}</div>
            <div
              className={`shrink-0 text-xs ${
                row.bucket === 'overdue' ? 'text-overdue' : 'text-ink-muted'
              }`}
            >
              {dueLabel(row.task, now)}
            </div>
          </div>
          <div className="truncate text-sm text-ink">
            {row.pot.display_name}
            {row.species && (
              <span className="text-ink-muted">
                {' '}
                · {row.species.common_name}
              </span>
            )}
          </div>
          {row.site && (
            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              <span>{row.site.icon}</span>
              <span>{row.site.name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={handleDone}
          className="flex-1 rounded-full bg-primary px-3 py-2 text-sm font-medium text-white active:scale-[0.98]"
        >
          {t('task.done')}
        </button>
        <div className="relative">
          <button
            onClick={() => setSnoozing((s) => !s)}
            className="rounded-full border border-black/10 px-3 py-2 text-sm text-ink"
          >
            {t('task.snooze')}
          </button>
          {snoozing && (
            <div className="absolute right-0 top-full z-10 mt-1 flex gap-1 rounded-xl border border-black/10 bg-card p-1 shadow-lg">
              {[1, 2, 3].map((d) => (
                <button
                  key={d}
                  onClick={() => snoozeDays(d)}
                  className="rounded-lg px-3 py-1.5 text-sm hover:bg-primary/10"
                >
                  +{d}{t('common.dSuffix')}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={confirmSkip}
          className="rounded-full px-3 py-2 text-sm text-ink-muted"
        >
          {t('task.skip')}
        </button>
      </div>

      {pickerOpen && (
        <FertilizerPicker
          preselectId={preselect}
          onCancel={() => setPickerOpen(false)}
          onPick={(id) => {
            setPickerOpen(false);
            onComplete(id);
          }}
        />
      )}
    </div>
  );
}
