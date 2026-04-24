import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../ui/Button';
import { t } from '../../i18n';
import { speciesRepo } from '../../data/repositories';
import type { PlantSpecies } from '../../domain/types';
import { defaultDraft, type AddPlantDraft } from './draft';
import { saveDraft } from './saveDraft';
import { StepSpecies } from './steps/StepSpecies';
import { StepName } from './steps/StepName';
import { StepPotDetails } from './steps/StepPotDetails';
import { StepLightLocation } from './steps/StepLightLocation';
import { StepLastDates } from './steps/StepLastDates';
import { StepReview } from './steps/StepReview';

const STEPS = ['species', 'name', 'pot', 'light', 'dates', 'review'] as const;
type Step = (typeof STEPS)[number];

export function AddPlantFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('species');
  const [draft, setDraft] = useState<AddPlantDraft>(defaultDraft());
  const [species, setSpecies] = useState<PlantSpecies | null>(null);
  const [saving, setSaving] = useState(false);

  function patch(p: Partial<AddPlantDraft>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  async function pickSpecies(s: PlantSpecies) {
    setSpecies(s);
    patch({ species_id: s.id, display_name: s.common_name });
    setStep('name');
  }

  function back() {
    const i = STEPS.indexOf(step);
    if (i === 0) return navigate('/');
    setStep(STEPS[i - 1]);
  }

  function next() {
    const i = STEPS.indexOf(step);
    if (i < STEPS.length - 1) setStep(STEPS[i + 1]);
  }

  async function finish() {
    if (!species) return;
    setSaving(true);
    try {
      // Re-fetch species by id in case the seed was updated mid-session.
      const fresh = await speciesRepo.getById(species.id);
      await saveDraft(draft, fresh ?? species);
      navigate('/plants');
    } finally {
      setSaving(false);
    }
  }

  const stepIndex = STEPS.indexOf(step);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col p-4">
      <header className="flex items-center justify-between pb-4">
        <button
          type="button"
          onClick={back}
          className="text-sm text-ink-muted underline"
        >
          {t('addPlant.back')}
        </button>
        <span className="text-xs text-ink-muted">
          {t('addPlant.step', { current: stepIndex + 1, total: STEPS.length })}
        </span>
      </header>

      <div className="flex gap-1 pb-4">
        {STEPS.map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition ${
              i <= stepIndex ? 'bg-primary' : 'bg-black/10'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 pb-6">
        {step === 'species' && <StepSpecies onPick={pickSpecies} />}
        {step === 'name' && species && (
          <StepName draft={draft} species={species} onChange={patch} />
        )}
        {step === 'pot' && (
          <StepPotDetails draft={draft} onChange={patch} />
        )}
        {step === 'light' && (
          <StepLightLocation draft={draft} onChange={patch} />
        )}
        {step === 'dates' && (
          <StepLastDates draft={draft} onChange={patch} />
        )}
        {step === 'review' && species && (
          <StepReview draft={draft} species={species} />
        )}
      </div>

      {step !== 'species' && (
        <div className="sticky bottom-0 -mx-4 border-t border-black/5 bg-surface/90 p-4 backdrop-blur">
          {step === 'review' ? (
            <Button
              className="w-full"
              disabled={saving}
              onClick={finish}
            >
              {saving ? t('common.saving') : t('addPlant.savePlant')}
            </Button>
          ) : (
            <Button
              className="w-full"
              disabled={step === 'name' && !draft.display_name.trim()}
              onClick={next}
            >
              {t('common.continue')}
            </Button>
          )}
        </div>
      )}
    </main>
  );
}
