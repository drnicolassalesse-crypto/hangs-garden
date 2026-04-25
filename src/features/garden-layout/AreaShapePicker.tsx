import { useState } from 'react';
import type { AreaShapeTemplate } from '../../domain/types';
import { t } from '../../i18n';
import { TextInput } from '../../ui/Field';

interface AreaShapePickerProps {
  onPick: (
    template: AreaShapeTemplate,
    label: string,
    widthCm: number | undefined,
    heightCm: number | undefined,
  ) => void;
  onClose: () => void;
}

const TEMPLATES: {
  type: AreaShapeTemplate;
  labelKey: string;
  descKey: string;
  preview: string;
}[] = [
  {
    type: 'rectangle',
    labelKey: 'gardenLayout.shapePicker.rectangle',
    descKey: 'gardenLayout.shapePicker.rectangle.desc',
    preview: '\u25AC',
  },
  {
    type: 'l_shape',
    labelKey: 'gardenLayout.shapePicker.lShape',
    descKey: 'gardenLayout.shapePicker.lShape.desc',
    preview: '\u231E',
  },
  {
    type: 'u_shape',
    labelKey: 'gardenLayout.shapePicker.uShape',
    descKey: 'gardenLayout.shapePicker.uShape.desc',
    preview: '\u2294',
  },
];

export function AreaShapePicker({ onPick, onClose }: AreaShapePickerProps) {
  const [selected, setSelected] = useState<AreaShapeTemplate | null>(null);
  const [label, setLabel] = useState('');
  const [widthStr, setWidthStr] = useState('');
  const [heightStr, setHeightStr] = useState('');

  function handleConfirm() {
    if (!selected) return;
    const w = parseFloat(widthStr);
    const h = parseFloat(heightStr);
    onPick(
      selected,
      label.trim(),
      w > 0 ? w : undefined,
      h > 0 ? h : undefined,
    );
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-card p-4 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-black/10" />
        <h3 className="mb-3 font-display text-lg font-semibold text-ink">
          {t('gardenLayout.shapePicker.heading')}
        </h3>

        <div className="flex flex-col gap-2">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.type}
              type="button"
              onClick={() => setSelected(tpl.type)}
              className={`flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition-colors ${
                selected === tpl.type
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent bg-surface'
              }`}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl">
                {tpl.preview}
              </span>
              <div>
                <div className="text-sm font-medium text-ink">
                  {t(tpl.labelKey)}
                </div>
                <div className="text-xs text-ink-muted">{t(tpl.descKey)}</div>
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <div className="mt-4 flex flex-col gap-3">
            {/* Label */}
            <TextInput
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t('gardenLayout.shapePicker.labelPlaceholder')}
              className="w-full"
            />

            {/* Dimensions */}
            <div>
              <div className="mb-1.5 text-xs font-medium text-ink-muted">
                {t('gardenLayout.shapePicker.dimensions')}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex flex-1 items-center gap-1">
                  <TextInput
                    value={widthStr}
                    onChange={(e) => setWidthStr(e.target.value)}
                    placeholder={t('gardenLayout.shapePicker.width')}
                    inputMode="decimal"
                    className="w-full"
                  />
                  <span className="text-xs text-ink-muted">cm</span>
                </div>
                <span className="text-ink-muted">\u00D7</span>
                <div className="flex flex-1 items-center gap-1">
                  <TextInput
                    value={heightStr}
                    onChange={(e) => setHeightStr(e.target.value)}
                    placeholder={t('gardenLayout.shapePicker.height')}
                    inputMode="decimal"
                    className="w-full"
                  />
                  <span className="text-xs text-ink-muted">cm</span>
                </div>
              </div>
              <p className="mt-1 text-[10px] text-ink-muted">
                {t('gardenLayout.shapePicker.dimensionsHint')}
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/10 px-4 py-2 text-sm"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selected}
            className="flex-1 rounded-full bg-primary px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {t('common.add')}
          </button>
        </div>
      </div>
    </div>
  );
}
