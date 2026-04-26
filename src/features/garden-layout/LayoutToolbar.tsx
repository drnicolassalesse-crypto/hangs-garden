import type { InteractionState } from './useGardenLayoutState';
import { t } from '../../i18n';

interface LayoutToolbarProps {
  interaction: InteractionState;
  canUndo: boolean;
  saving: boolean;
  onUndo: () => void;
  onAddArea: () => void;
  onOpenPalette: () => void;
  onAddMarker: () => void;
  onOpenObjectList: () => void;
  onCenter: () => void;
  onDeleteSelected: () => void;
}

export function LayoutToolbar({
  interaction,
  canUndo,
  saving,
  onUndo,
  onAddArea,
  onOpenPalette,
  onAddMarker,
  onOpenObjectList,
  onCenter,
  onDeleteSelected,
}: LayoutToolbarProps) {
  const hasSelection =
    interaction.kind === 'area_selected' ||
    interaction.kind === 'point_selected';

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto px-3 py-2.5">
      {/* Undo */}
      <ToolBtn
        onClick={onUndo}
        disabled={!canUndo}
        label={t('gardenLayout.toolbar.undo')}
      />

      <Divider />

      {/* Add actions */}
      <ToolBtn onClick={onAddArea} label={t('gardenLayout.toolbar.addArea')} />
      <ToolBtn
        onClick={onOpenPalette}
        label={t('gardenLayout.toolbar.placePlants')}
      />
      <ToolBtn onClick={onAddMarker} label={t('gardenLayout.toolbar.addMarker')} />

      <Divider />

      {/* Object list */}
      <ToolBtn
        onClick={onOpenObjectList}
        label={t('gardenLayout.toolbar.objectList')}
      />

      {/* Center */}
      <ToolBtn
        onClick={onCenter}
        label={t('gardenLayout.toolbar.center')}
      />

      {/* Delete (only when something selected) */}
      {hasSelection && (
        <>
          <Divider />
          <ToolBtn
            onClick={onDeleteSelected}
            label={t('gardenLayout.toolbar.deleteArea')}
            danger
          />
        </>
      )}

      {/* Saving indicator */}
      {saving && (
        <span className="ml-auto text-xs text-ink-muted">
          {t('gardenLayout.saving')}
        </span>
      )}
    </div>
  );
}

function ToolBtn({
  onClick,
  label,
  disabled,
  active,
  danger,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  active?: boolean;
  danger?: boolean;
}) {
  let cls =
    'whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium active:scale-[0.98] transition-colors';
  if (danger) {
    cls += ' bg-overdue/10 text-overdue';
  } else if (active) {
    cls += ' bg-primary text-white';
  } else if (disabled) {
    cls += ' bg-black/5 text-ink-muted opacity-40';
  } else {
    cls += ' bg-primary/10 text-primary';
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {label}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px bg-black/10" />;
}
