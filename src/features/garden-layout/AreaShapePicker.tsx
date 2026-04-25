import { useState } from 'react';
import type { AreaShapeTemplate } from '../../domain/types';
import { t } from '../../i18n';
import { TextInput } from '../../ui/Field';

interface AreaShapePickerProps {
  onPick: (template: AreaShapeTemplate, label: string) => void;
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
    preview: '▬',
  },
  {
    type: 'l_shape',
    labelKey: 'gardenLayout.shapePicker.lShape',
    descKey: 'gardenLayout.shapePicker.lShape.desc',
    preview: '⌐',
  },
  {
    type: 'u_shape',
    labelKey: 'gardenLayout.shapePicker.uShape',
    descKey: 'gardenLayout.shapePicker.uShape.desc',
    preview: '⊔',
  },
];

export function AreaShapePicker({ onPick, onClose }: AreaShapePickerProps) {
  const [selected, setSelected] = useState<AreaShapeTemplate | null>(null);
  const [label, setLabel] = useState('');

  function handleConfirm() {
    if (!selected) return;
    onPick(selected, label.trim());
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full rounded-t-3xl bg-card p-4 pb-8"
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
          <div className="mt-3">
            <TextInput
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t('gardenLayout.shapePicker.labelPlaceholder')}
              className="w-full"
            />
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
