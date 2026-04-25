import type { MarkerType } from '../../domain/types';
import { t } from '../../i18n';

interface MarkerPickerProps {
  onPick: (type: MarkerType) => void;
  onClose: () => void;
}

const MARKERS: { type: MarkerType; emoji: string; labelKey: string }[] = [
  {
    type: 'water_source',
    emoji: '\u{1F4A7}',
    labelKey: 'gardenLayout.markerPicker.waterSource',
  },
  {
    type: 'compass',
    emoji: '\u{1F9ED}',
    labelKey: 'gardenLayout.markerPicker.compass',
  },
];

export function MarkerPicker({ onPick, onClose }: MarkerPickerProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full rounded-t-3xl bg-card p-4 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-black/10" />
        <h3 className="mb-3 font-display text-lg font-semibold text-ink">
          {t('gardenLayout.markerPicker.heading')}
        </h3>

        <div className="flex gap-3">
          {MARKERS.map((m) => (
            <button
              key={m.type}
              type="button"
              onClick={() => {
                onPick(m.type);
                onClose();
              }}
              className="flex flex-1 flex-col items-center gap-2 rounded-2xl bg-surface p-4 active:scale-[0.98]"
            >
              <span className="text-3xl">{m.emoji}</span>
              <span className="text-sm font-medium text-ink">
                {t(m.labelKey)}
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-full border border-black/10 px-4 py-2 text-sm"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}
