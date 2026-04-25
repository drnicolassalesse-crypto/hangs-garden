import { useState } from 'react';
import type { GardenArea, UUID } from '../../domain/types';
import { t } from '../../i18n';
import { TextInput } from '../../ui/Field';

interface ObjectListPanelProps {
  areas: GardenArea[];
  selectedId: UUID | null;
  onSelect: (id: UUID) => void;
  onToggleVisibility: (id: UUID, visible: boolean) => void;
  onUpdateLabel: (id: UUID, label: string) => void;
  onResizeArea: (id: UUID, widthCm: number, heightCm: number) => void;
  onClose: () => void;
}

export function ObjectListPanel({
  areas,
  selectedId,
  onSelect,
  onToggleVisibility,
  onUpdateLabel,
  onResizeArea,
  onClose,
}: ObjectListPanelProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative max-h-[60vh] w-full overflow-y-auto rounded-t-3xl bg-card p-4 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-black/10" />
        <h3 className="mb-3 font-display text-lg font-semibold text-ink">
          {t('gardenLayout.objectList.heading')}
        </h3>

        {areas.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-muted">
            {t('gardenLayout.objectList.empty')}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {areas.map((area) => (
              <AreaListItem
                key={area.id}
                area={area}
                isSelected={selectedId === area.id}
                onSelect={() => onSelect(area.id)}
                onToggleVisibility={(v) => onToggleVisibility(area.id, v)}
                onUpdateLabel={(l) => onUpdateLabel(area.id, l)}
                onResize={(w, h) => onResizeArea(area.id, w, h)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AreaListItem({
  area,
  isSelected,
  onSelect,
  onToggleVisibility,
  onUpdateLabel,
  onResize,
}: {
  area: GardenArea;
  isSelected: boolean;
  onSelect: () => void;
  onToggleVisibility: (visible: boolean) => void;
  onUpdateLabel: (label: string) => void;
  onResize: (widthCm: number, heightCm: number) => void;
}) {
  const isVisible = area.visible !== false;
  const [editing, setEditing] = useState(false);
  const [labelDraft, setLabelDraft] = useState(area.label);
  const [wDraft, setWDraft] = useState(String(area.width_cm ?? ''));
  const [hDraft, setHDraft] = useState(String(area.height_cm ?? ''));

  function handleSave() {
    onUpdateLabel(labelDraft.trim());
    const w = parseFloat(wDraft);
    const h = parseFloat(hDraft);
    if (w > 0 && h > 0) {
      onResize(w, h);
    }
    setEditing(false);
  }

  return (
    <li
      className={`rounded-xl border-2 p-3 ${
        isSelected ? 'border-primary bg-primary/5' : 'border-transparent bg-surface'
      }`}
    >
      <div className="flex items-center gap-2">
        {/* Color swatch */}
        <div
          className="h-4 w-4 rounded"
          style={{ backgroundColor: area.fill_color }}
        />

        {/* Name / select */}
        <button
          type="button"
          onClick={onSelect}
          className="min-w-0 flex-1 truncate text-left text-sm font-medium text-ink"
        >
          {area.label || t('gardenLayout.objectList.untitled')}
        </button>

        {/* Dimensions badge */}
        {area.width_cm && area.height_cm && (
          <span className="text-[10px] text-ink-muted">
            {area.width_cm}\u00D7{area.height_cm}cm
          </span>
        )}

        {/* Edit button */}
        <button
          type="button"
          onClick={() => setEditing(!editing)}
          className="rounded-full px-2 py-0.5 text-xs text-primary"
        >
          {editing ? t('common.close') : t('common.edit')}
        </button>

        {/* Visibility toggle */}
        <button
          type="button"
          onClick={() => onToggleVisibility(!isVisible)}
          className={`text-lg ${isVisible ? '' : 'opacity-30'}`}
          title={isVisible ? 'Hide' : 'Show'}
        >
          {isVisible ? '\u{1F441}' : '\u{1F441}'}
        </button>
      </div>

      {/* Editing panel */}
      {editing && (
        <div className="mt-2 flex flex-col gap-2 border-t border-black/5 pt-2">
          <TextInput
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            placeholder={t('gardenLayout.shapePicker.labelPlaceholder')}
            className="w-full text-sm"
          />
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-1">
              <TextInput
                value={wDraft}
                onChange={(e) => setWDraft(e.target.value)}
                placeholder={t('gardenLayout.shapePicker.width')}
                inputMode="decimal"
                className="w-full text-sm"
              />
              <span className="text-xs text-ink-muted">cm</span>
            </div>
            <span className="text-ink-muted">\u00D7</span>
            <div className="flex flex-1 items-center gap-1">
              <TextInput
                value={hDraft}
                onChange={(e) => setHDraft(e.target.value)}
                placeholder={t('gardenLayout.shapePicker.height')}
                inputMode="decimal"
                className="w-full text-sm"
              />
              <span className="text-xs text-ink-muted">cm</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-full bg-primary px-4 py-1.5 text-sm text-white"
          >
            {t('common.save')}
          </button>
        </div>
      )}
    </li>
  );
}
