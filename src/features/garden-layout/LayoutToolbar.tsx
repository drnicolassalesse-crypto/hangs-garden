import type { EditorMode } from './useGardenLayoutState';
import type { UUID } from '../../domain/types';
import { t } from '../../i18n';

interface LayoutToolbarProps {
  mode: EditorMode;
  selectedId: UUID | null;
  saving: boolean;
  onSetMode: (mode: EditorMode) => void;
  onAddArea: () => void;
  onDeleteSelected: () => void;
  onOpenPalette: () => void;
  onAddMarker: () => void;
}

export function LayoutToolbar({
  mode,
  selectedId,
  saving,
  onSetMode,
  onAddArea,
  onDeleteSelected,
  onOpenPalette,
  onAddMarker,
}: LayoutToolbarProps) {
  if (mode === 'view') {
    return (
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-xs text-ink-muted">
          {saving
            ? t('gardenLayout.saving')
            : t('gardenLayout.canvas.pinchHint')}
        </span>
        <button
          type="button"
          onClick={() => onSetMode('edit_areas')}
          className="rounded-full bg-primary px-4 py-2 text-sm text-white active:scale-[0.98]"
        >
          {t('gardenLayout.toolbar.edit')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-2">
      {/* Mode tabs */}
      <div className="flex gap-1 rounded-full bg-surface p-1">
        <ModeTab
          label={t('gardenLayout.toolbar.areas')}
          isActive={mode === 'edit_areas'}
          onClick={() => onSetMode('edit_areas')}
        />
        <ModeTab
          label={t('gardenLayout.toolbar.plants')}
          isActive={mode === 'place_plants'}
          onClick={() => onSetMode('place_plants')}
        />
        <ModeTab
          label={t('gardenLayout.toolbar.markers')}
          isActive={mode === 'place_markers'}
          onClick={() => onSetMode('place_markers')}
        />
      </div>

      {/* Contextual actions */}
      <div className="flex items-center gap-2">
        {mode === 'edit_areas' && (
          <>
            <button
              type="button"
              onClick={onAddArea}
              className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary active:scale-[0.98]"
            >
              {t('gardenLayout.toolbar.addArea')}
            </button>
            {selectedId && (
              <button
                type="button"
                onClick={onDeleteSelected}
                className="rounded-full bg-overdue/10 px-3 py-1.5 text-sm font-medium text-overdue active:scale-[0.98]"
              >
                {t('gardenLayout.toolbar.deleteArea')}
              </button>
            )}
          </>
        )}

        {mode === 'place_plants' && (
          <button
            type="button"
            onClick={onOpenPalette}
            className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary active:scale-[0.98]"
          >
            {t('gardenLayout.toolbar.placePlants')}
          </button>
        )}

        {mode === 'place_markers' && (
          <>
            <button
              type="button"
              onClick={onAddMarker}
              className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary active:scale-[0.98]"
            >
              {t('gardenLayout.toolbar.addMarker')}
            </button>
            {selectedId && (
              <button
                type="button"
                onClick={onDeleteSelected}
                className="rounded-full bg-overdue/10 px-3 py-1.5 text-sm font-medium text-overdue active:scale-[0.98]"
              >
                {t('gardenLayout.toolbar.deleteMarker')}
              </button>
            )}
          </>
        )}

        <span className="flex-1" />
        {saving && (
          <span className="text-xs text-ink-muted">
            {t('gardenLayout.saving')}
          </span>
        )}
        <button
          type="button"
          onClick={() => onSetMode('view')}
          className="rounded-full bg-primary px-4 py-1.5 text-sm text-white active:scale-[0.98]"
        >
          {t('gardenLayout.toolbar.done')}
        </button>
      </div>
    </div>
  );
}

function ModeTab({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-full px-3 py-1.5 text-center text-xs font-medium transition-colors ${
        isActive
          ? 'bg-white text-primary shadow-sm'
          : 'text-ink-muted'
      }`}
    >
      {label}
    </button>
  );
}
