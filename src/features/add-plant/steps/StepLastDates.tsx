import { Field, TextInput } from '../../../ui/Field';
import { t } from '../../../i18n';
import type { AddPlantDraft } from '../draft';

function toInputValue(ms: number | null): string {
  if (ms === null) return '';
  const d = new Date(ms);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function fromInputValue(v: string): number | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(8, 0, 0, 0);
  return d.getTime();
}

export function StepLastDates({
  draft,
  onChange,
}: {
  draft: AddPlantDraft;
  onChange: (patch: Partial<AddPlantDraft>) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-2xl font-semibold text-ink">
          {t('addPlant.dates.heading')}
        </h2>
        <p className="text-sm text-ink-muted">
          {t('addPlant.dates.hint')}
        </p>
      </div>

      <Field label={t('addPlant.dates.lastWatered')} hint={t('addPlant.dates.lastWatered.hint')}>
        <TextInput
          type="date"
          value={toInputValue(draft.last_watered_at)}
          onChange={(e) =>
            onChange({ last_watered_at: fromInputValue(e.target.value) })
          }
          max={toInputValue(Date.now())}
        />
      </Field>

      <Field label={t('addPlant.dates.lastFertilized')}>
        <TextInput
          type="date"
          value={toInputValue(draft.last_fertilized_at)}
          onChange={(e) =>
            onChange({ last_fertilized_at: fromInputValue(e.target.value) })
          }
          max={toInputValue(Date.now())}
        />
      </Field>
    </div>
  );
}
