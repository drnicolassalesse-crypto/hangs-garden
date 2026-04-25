import { Field } from '../../../ui/Field';
import { t } from '../../../i18n';
import type {
  PotMaterial,
  PotSize,
  SoilType,
} from '../../../domain/types';
import type { AddPlantDraft } from '../draft';

const SIZES: { value: PotSize; labelKey: string; hintKey: string }[] = [
  { value: 'xs', labelKey: 'addPlant.pot.sizeXS', hintKey: 'addPlant.pot.sizeXS.hint' },
  { value: 's', labelKey: 'addPlant.pot.sizeS', hintKey: 'addPlant.pot.sizeS.hint' },
  { value: 'm', labelKey: 'addPlant.pot.sizeM', hintKey: 'addPlant.pot.sizeM.hint' },
  { value: 'l', labelKey: 'addPlant.pot.sizeL', hintKey: 'addPlant.pot.sizeL.hint' },
  { value: 'xl', labelKey: 'addPlant.pot.sizeXL', hintKey: 'addPlant.pot.sizeXL.hint' },
];

const MATERIALS: {
  value: PotMaterial;
  labelKey: string;
  color: string;
  icon: string;
}[] = [
  { value: 'plastic', labelKey: 'addPlant.pot.plastic', color: '#94A3B8', icon: '\u{1FAB4}' },
  { value: 'terracotta', labelKey: 'addPlant.pot.terracotta', color: '#C2714F', icon: '\u{1FAB4}' },
  { value: 'ceramic', labelKey: 'addPlant.pot.ceramic', color: '#F0EDE8', icon: '\u{1FAB4}' },
  { value: 'fabric', labelKey: 'addPlant.pot.fabric', color: '#8B7355', icon: '\u{1FAB4}' },
  { value: 'glass', labelKey: 'addPlant.pot.glass', color: '#BFDBFE', icon: '\u{1FAB4}' },
  { value: 'metal', labelKey: 'addPlant.pot.metal', color: '#9CA3AF', icon: '\u{1FAB4}' },
  { value: 'wood', labelKey: 'addPlant.pot.wood', color: '#A0845C', icon: '\u{1FAB4}' },
];

const SOILS: { value: SoilType; labelKey: string }[] = [
  { value: 'standard', labelKey: 'addPlant.pot.standard' },
  { value: 'succulent_cactus', labelKey: 'addPlant.pot.succulent' },
  { value: 'orchid', labelKey: 'addPlant.pot.orchid' },
  { value: 'moisture_retaining', labelKey: 'addPlant.pot.moisture' },
  { value: 'peat_free', labelKey: 'addPlant.pot.peatFree' },
];

export function StepPotDetails({
  draft,
  onChange,
}: {
  draft: AddPlantDraft;
  onChange: (patch: Partial<AddPlantDraft>) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-display text-2xl font-semibold text-ink">
        {t('addPlant.pot.heading')}
      </h2>

      <Field label={t('addPlant.pot.size')}>
        <div className="grid grid-cols-5 gap-2">
          {SIZES.map((s) => (
            <Pill
              key={s.value}
              selected={draft.pot_size === s.value}
              onClick={() => onChange({ pot_size: s.value })}
            >
              <div className="font-semibold">{t(s.labelKey)}</div>
              <div className="text-[10px] text-ink-muted">{t(s.hintKey)}</div>
            </Pill>
          ))}
        </div>
      </Field>

      <Field label={t('addPlant.pot.material')}>
        <div className="grid grid-cols-4 gap-2">
          {MATERIALS.map((m) => (
            <Pill
              key={m.value}
              selected={draft.pot_material === m.value}
              onClick={() => onChange({ pot_material: m.value })}
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-sm"
                style={{ backgroundColor: m.color }}
              >
                {m.icon}
              </div>
              <div className="text-xs">{t(m.labelKey)}</div>
            </Pill>
          ))}
        </div>
      </Field>

      <Field label={t('addPlant.pot.soil')}>
        <div className="flex flex-col gap-2">
          {SOILS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => onChange({ soil_type: s.value })}
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                draft.soil_type === s.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-black/10 bg-card text-ink hover:border-primary/40'
              }`}
            >
              {t(s.labelKey)}
            </button>
          ))}
        </div>
      </Field>
    </div>
  );
}

function Pill({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center rounded-xl border p-2 transition ${
        selected
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-black/10 bg-card text-ink hover:border-primary/40'
      }`}
    >
      {children}
    </button>
  );
}
