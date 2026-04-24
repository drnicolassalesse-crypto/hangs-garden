import {
  computeCalculatedInterval,
} from '../../../domain/schedule';
import { t, tp } from '../../../i18n';
import type { ActionType, PlantSpecies, Pot } from '../../../domain/types';
import type { AddPlantDraft } from '../draft';

const ACTIONS: { value: ActionType; labelKey: string; emojiKey: string }[] = [
  { value: 'watering', labelKey: 'action.watering', emojiKey: 'action.watering.emoji' },
  { value: 'fertilizing', labelKey: 'action.fertilizing', emojiKey: 'action.fertilizing.emoji' },
  { value: 'misting', labelKey: 'action.misting', emojiKey: 'action.misting.emoji' },
  { value: 'repotting', labelKey: 'action.repotting', emojiKey: 'action.repotting.emoji' },
  { value: 'pruning', labelKey: 'action.pruning', emojiKey: 'action.pruning.emoji' },
  { value: 'cleaning', labelKey: 'action.cleaning', emojiKey: 'action.cleaning.emoji' },
];

export function StepReview({
  draft,
  species,
}: {
  draft: AddPlantDraft;
  species: PlantSpecies;
}) {
  // Build a synthetic Pot just to get the schedule preview
  const fakePot = {
    pot_size: draft.pot_size,
    pot_material: draft.pot_material,
    soil_type: draft.soil_type,
    light_level: draft.light_level,
    location_type: draft.location_type,
  } as Pot;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-2xl font-semibold text-ink">{t('addPlant.review.heading')}</h2>

      <div className="rounded-2xl bg-card p-4 shadow-sm">
        <div className="font-medium text-ink">{draft.display_name}</div>
        <div className="text-sm italic text-ink-muted">
          {species.scientific_name}
        </div>
        <Row label={t('addPlant.review.pot')} value={`${draft.pot_size.toUpperCase()} · ${draft.pot_material}`} />
        <Row label={t('addPlant.review.soil')} value={draft.soil_type.replace('_', ' ')} />
        <Row label={t('addPlant.review.light')} value={draft.light_level.replace('_', ' ')} />
        <Row label={t('addPlant.review.location')} value={draft.location_type} />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-ink-muted">
          {t('addPlant.review.schedule')}
        </h3>
        <ul className="rounded-2xl bg-card shadow-sm">
          {ACTIONS.map((a) => {
            const days = computeCalculatedInterval(a.value, species, fakePot);
            return (
              <li
                key={a.value}
                className="flex items-center justify-between border-b border-black/5 px-4 py-2.5 last:border-b-0"
              >
                <span>
                  <span className="mr-2">{t(a.emojiKey)}</span>
                  {t(a.labelKey)}
                </span>
                <span className="text-sm text-ink-muted">
                  {tp('common.everyDays', days)}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-ink-muted">
          {t('addPlant.review.hint')}
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-2 flex justify-between text-sm">
      <span className="text-ink-muted">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}
