import { useEffect, useState } from 'react';
import { t } from '../../i18n';
import { TextInput } from '../../ui/Field';

interface MeasurePanelProps {
  /** null when no edge is selected */
  edgeIndex: number | null;
  lengthCm: number | null;
  onApply: (newLengthCm: number) => void;
}

export function MeasurePanel({ edgeIndex, lengthCm, onApply }: MeasurePanelProps) {
  const [draft, setDraft] = useState('');

  // Sync draft when a new edge is selected
  useEffect(() => {
    if (lengthCm !== null) {
      setDraft(String(lengthCm));
    }
  }, [lengthCm, edgeIndex]);

  const hasEdge = edgeIndex !== null && lengthCm !== null;

  function handleApply() {
    const v = parseFloat(draft);
    if (v > 0) onApply(v);
  }

  return (
    <div className="flex items-center gap-2 border-t border-black/5 bg-card px-3 py-2">
      <span className="shrink-0 text-xs font-medium text-ink-muted">
        {t('gardenLayout.measure.label')}
      </span>
      <TextInput
        value={hasEdge ? draft : ''}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={hasEdge ? '' : t('gardenLayout.measure.placeholder')}
        inputMode="decimal"
        disabled={!hasEdge}
        className="w-20 text-center text-sm"
      />
      <span className="text-xs text-ink-muted">cm</span>
      <button
        type="button"
        onClick={handleApply}
        disabled={!hasEdge || !draft}
        className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 active:scale-[0.98]"
      >
        {t('gardenLayout.measure.activate')}
      </button>
      {hasEdge && (
        <span className="text-[10px] text-ink-muted">
          {t('gardenLayout.measure.edge', { n: String(edgeIndex + 1) })}
        </span>
      )}
    </div>
  );
}
