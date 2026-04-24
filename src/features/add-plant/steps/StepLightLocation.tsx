import { useState } from 'react';
import { ChoiceCard, Field } from '../../../ui/Field';
import { t } from '../../../i18n';
import type { LightLevel, LocationType } from '../../../domain/types';
import type { AddPlantDraft } from '../draft';
import { LightMeterSheet } from '../../light-meter/LightMeterSheet';

const LIGHT: { value: LightLevel; titleKey: string; descKey: string }[] = [
  { value: 'low', titleKey: 'addPlant.light.low', descKey: 'addPlant.light.low.desc' },
  { value: 'medium', titleKey: 'addPlant.light.medium', descKey: 'addPlant.light.medium.desc' },
  { value: 'bright_indirect', titleKey: 'addPlant.light.brightIndirect', descKey: 'addPlant.light.brightIndirect.desc' },
  { value: 'direct_sunlight', titleKey: 'addPlant.light.direct', descKey: 'addPlant.light.direct.desc' },
];

const LOCATIONS: { value: LocationType; titleKey: string; descKey: string }[] = [
  { value: 'indoor', titleKey: 'addPlant.location.indoor', descKey: 'addPlant.location.indoor.desc' },
  { value: 'outdoor', titleKey: 'addPlant.location.outdoor', descKey: 'addPlant.location.outdoor.desc' },
  { value: 'greenhouse', titleKey: 'addPlant.location.greenhouse', descKey: 'addPlant.location.greenhouse.desc' },
];

export function StepLightLocation({
  draft,
  onChange,
}: {
  draft: AddPlantDraft;
  onChange: (patch: Partial<AddPlantDraft>) => void;
}) {
  const [meterOpen, setMeterOpen] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-display text-2xl font-semibold text-ink">
        {t('addPlant.light.heading')}
      </h2>

      <Field label={t('addPlant.light.level')}>
        <div className="flex flex-col gap-2">
          {LIGHT.map((l) => (
            <ChoiceCard
              key={l.value}
              selected={draft.light_level === l.value}
              title={t(l.titleKey)}
              description={t(l.descKey)}
              onClick={() => onChange({ light_level: l.value })}
            />
          ))}
          <button
            type="button"
            onClick={() => setMeterOpen(true)}
            className="mt-1 self-start rounded-full border border-primary/30 px-3 py-1 text-xs text-primary"
          >
            {t('addPlant.light.useMeter')}
          </button>
        </div>
      </Field>

      {meterOpen && (
        <LightMeterSheet
          initial={draft.light_level}
          onClose={() => setMeterOpen(false)}
          onPick={(lvl) => onChange({ light_level: lvl })}
        />
      )}

      <Field label={t('addPlant.location.heading')}>
        <div className="flex flex-col gap-2">
          {LOCATIONS.map((l) => (
            <ChoiceCard
              key={l.value}
              selected={draft.location_type === l.value}
              title={t(l.titleKey)}
              description={t(l.descKey)}
              onClick={() => onChange({ location_type: l.value })}
            />
          ))}
        </div>
      </Field>
    </div>
  );
}
