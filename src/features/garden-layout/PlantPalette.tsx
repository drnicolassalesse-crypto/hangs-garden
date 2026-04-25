import type { PlantSummary } from '../../domain/plantSummary';
import type { UUID } from '../../domain/types';
import {
  CARE_STATUS_COLORS,
  getPlantCareStatus,
} from '../../domain/gardenLayout';
import { t } from '../../i18n';

interface PlantPaletteProps {
  unplacedPlants: PlantSummary[];
  pendingPlantId: UUID | null;
  onSelectPlant: (potId: UUID) => void;
  onClose: () => void;
}

export function PlantPalette({
  unplacedPlants,
  pendingPlantId,
  onSelectPlant,
  onClose,
}: PlantPaletteProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative max-h-[50vh] w-full overflow-y-auto rounded-t-3xl bg-card p-4 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-black/10" />
        <h3 className="mb-1 font-display text-lg font-semibold text-ink">
          {t('gardenLayout.palette.heading')}
        </h3>
        <p className="mb-3 text-xs text-ink-muted">
          {t('gardenLayout.palette.hint')}
        </p>

        {unplacedPlants.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">
            {t('gardenLayout.palette.empty')}
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {unplacedPlants.map((s) => {
              const status = getPlantCareStatus(s);
              const isActive = pendingPlantId === s.pot.id;
              return (
                <li key={s.pot.id}>
                  <button
                    type="button"
                    onClick={() => onSelectPlant(s.pot.id)}
                    className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors ${
                      isActive
                        ? 'bg-primary/10 ring-2 ring-primary'
                        : 'bg-surface'
                    }`}
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full border-2 text-lg"
                      style={{ borderColor: CARE_STATUS_COLORS[status] }}
                    >
                      {'\u{1FAB4}'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-ink">
                        {s.pot.display_name}
                      </div>
                      {s.species && (
                        <div className="truncate text-xs italic text-ink-muted">
                          {s.species.common_name}
                        </div>
                      )}
                    </div>
                    {isActive && (
                      <span className="text-xs font-medium text-primary">
                        {t('gardenLayout.palette.tapCanvas')}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
