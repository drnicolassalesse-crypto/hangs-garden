import { useState } from 'react';
import { t } from '../../i18n';
import { TextInput } from '../../ui/Field';

interface MeasurePanelProps {
  edgeIndex: number;
  lengthCm: number;
  onApply: (newLengthCm: number) => void;
}

export function MeasurePanel({ edgeIndex, lengthCm, onApply }: MeasurePanelProps) {
  const [draft, setDraft] = useState(String(lengthCm));

  function handleApply() {
    const v = parseFloat(draft);
    if (v > 0) onApply(v);
  }

  return (
    <div className="flex items-center gap-2 bg-primary/5 px-4 py-2">
      <span className="text-xs font-medium text-ink-muted">
        {t('gardenLayout.measure.edge', { n: String(edgeIndex + 1) })}
      </span>
      <div className="flex items-center gap-1">
        <TextInput
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          inputMode="decimal"
          className="w-20 text-center text-sm"
        />
        <span className="text-xs text-ink-muted">cm</span>
      </div>
      <button
        type="button"
        onClick={handleApply}
        className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-white active:scale-[0.98]"
      >
        {t('gardenLayout.measure.apply')}
      </button>
    </div>
  );
}
