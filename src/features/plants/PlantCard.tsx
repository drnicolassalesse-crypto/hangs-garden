import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { imagesRepo } from '../../data/repositories';
import { nextDueLabel, type PlantSummary } from '../../domain/plantSummary';
import type { ActionType } from '../../domain/types';

const ACTION_EMOJI: Record<ActionType, string> = {
  watering: '💧',
  fertilizing: '🌿',
  misting: '🌫️',
  repotting: '🪴',
  pruning: '✂️',
  cleaning: '🧹',
};

export function PlantCard({
  summary,
  mode,
}: {
  summary: PlantSummary;
  mode: 'grid' | 'list';
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!summary.pot.photo_blob_id) {
      setPhotoUrl(null);
      return;
    }
    imagesRepo.objectUrl(summary.pot.photo_blob_id).then(setPhotoUrl);
  }, [summary.pot.photo_blob_id]);

  const dueEmoji = summary.nextDueTask
    ? ACTION_EMOJI[summary.nextDueTask.action_type]
    : '✨';
  const dueText = nextDueLabel(summary);
  const dueClass = summary.anyOverdue ? 'text-overdue' : 'text-ink-muted';

  const Photo = (
    <div className="relative">
      {photoUrl ? (
        <img
          src={photoUrl}
          alt=""
          className={
            mode === 'grid'
              ? 'aspect-square w-full rounded-xl object-cover'
              : 'h-16 w-16 rounded-xl object-cover'
          }
        />
      ) : (
        <div
          className={
            mode === 'grid'
              ? 'flex aspect-square w-full items-center justify-center rounded-xl bg-primary/10 text-4xl'
              : 'flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-2xl'
          }
        >
          🪴
        </div>
      )}
      {summary.anyOverdue && (
        <span
          className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-warning ring-2 ring-card"
          aria-label="Has overdue tasks"
        />
      )}
    </div>
  );

  if (mode === 'grid') {
    return (
      <NavLink
        to={`/plants/${summary.pot.id}`}
        className="block rounded-2xl bg-card p-2 shadow-sm transition active:scale-[0.98]"
      >
        {Photo}
        <div className="p-2">
          <div className="truncate text-sm font-medium">
            {summary.pot.display_name}
          </div>
          <div className="truncate text-xs italic text-ink-muted">
            {summary.species?.common_name ?? '—'}
          </div>
          <div className={`mt-1 truncate text-xs ${dueClass}`}>
            {dueEmoji} {dueText}
          </div>
        </div>
      </NavLink>
    );
  }

  return (
    <NavLink
      to={`/plants/${summary.pot.id}`}
      className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm transition active:scale-[0.98]"
    >
      {Photo}
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{summary.pot.display_name}</div>
        <div className="truncate text-sm italic text-ink-muted">
          {summary.species?.common_name ?? '—'}
        </div>
        <div className={`mt-0.5 truncate text-xs ${dueClass}`}>
          {dueEmoji} {dueText}
        </div>
      </div>
      {summary.site && (
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
          {summary.site.icon}
        </span>
      )}
    </NavLink>
  );
}
