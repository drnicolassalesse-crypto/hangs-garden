import { useState } from 'react';
import { Button } from '../../ui/Button';
import { ChoiceCard, Field, TextInput } from '../../ui/Field';
import { useProfileStore } from '../../state/profileStore';
import type {
  NotificationFrequency,
  SkillLevel,
} from '../../domain/types';
import { t, useLocale, setLocale, type Locale } from '../../i18n';

const SKILL_OPTIONS: { value: SkillLevel; titleKey: string; descKey: string }[] = [
  { value: 'beginner', titleKey: 'onboarding.skill.beginner', descKey: 'onboarding.skill.beginner.desc' },
  { value: 'intermediate', titleKey: 'onboarding.skill.intermediate', descKey: 'onboarding.skill.intermediate.desc' },
  { value: 'expert', titleKey: 'onboarding.skill.expert', descKey: 'onboarding.skill.expert.desc' },
];

const FREQUENCY_OPTIONS: {
  value: NotificationFrequency;
  titleKey: string;
  descKey: string;
}[] = [
  { value: 'minimal', titleKey: 'onboarding.frequency.minimal', descKey: 'onboarding.frequency.minimal.desc' },
  { value: 'moderate', titleKey: 'onboarding.frequency.moderate', descKey: 'onboarding.frequency.moderate.desc' },
  { value: 'frequent', titleKey: 'onboarding.frequency.frequent', descKey: 'onboarding.frequency.frequent.desc' },
];

type Step = 'welcome' | 'name' | 'skill' | 'frequency';

export function OnboardingFlow() {
  const locale = useLocale();
  const save = useProfileStore((s) => s.save);
  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [skill, setSkill] = useState<SkillLevel>('beginner');
  const [frequency, setFrequency] = useState<NotificationFrequency>('moderate');
  const [submitting, setSubmitting] = useState(false);

  const trimmed = name.trim().slice(0, 40);
  const canContinueName = trimmed.length > 0;

  async function finish() {
    setSubmitting(true);
    try {
      await save({
        display_name: trimmed,
        skill_level: skill,
        notification_frequency: frequency,
      });
    } finally {
      setSubmitting(false);
    }
  }

  // Force re-evaluation when locale changes
  void locale;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-between p-6">
      <div className="flex flex-col gap-6 pt-12">
        {step === 'welcome' && (
          <>
            <div className="flex justify-center gap-2">
              {(['vi', 'en'] as Locale[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    locale === l
                      ? 'bg-primary text-white'
                      : 'bg-black/5 text-ink-muted'
                  }`}
                >
                  {l === 'vi' ? 'Tiếng Việt' : 'English'}
                </button>
              ))}
            </div>
            <div className="text-center">
              <h1 className="font-display text-5xl font-bold text-primary">
                {t('onboarding.welcome.title')}
              </h1>
              <p className="mt-3 text-ink-muted">
                {t('onboarding.welcome.subtitle')}
              </p>
            </div>
          </>
        )}

        {step === 'name' && (
          <>
            <h2 className="font-display text-2xl font-semibold text-ink">
              {t('onboarding.name.heading')}
            </h2>
            <Field label={t('onboarding.name.label')}>
              <TextInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('onboarding.name.placeholder')}
                maxLength={40}
                autoFocus
              />
            </Field>
          </>
        )}

        {step === 'skill' && (
          <>
            <h2 className="font-display text-2xl font-semibold text-ink">
              {t('onboarding.skill.heading')}
            </h2>
            <div className="flex flex-col gap-3">
              {SKILL_OPTIONS.map((opt) => (
                <ChoiceCard
                  key={opt.value}
                  selected={skill === opt.value}
                  title={t(opt.titleKey)}
                  description={t(opt.descKey)}
                  onClick={() => setSkill(opt.value)}
                />
              ))}
            </div>
          </>
        )}

        {step === 'frequency' && (
          <>
            <h2 className="font-display text-2xl font-semibold text-ink">
              {t('onboarding.frequency.heading')}
            </h2>
            <div className="flex flex-col gap-3">
              {FREQUENCY_OPTIONS.map((opt) => (
                <ChoiceCard
                  key={opt.value}
                  selected={frequency === opt.value}
                  title={t(opt.titleKey)}
                  description={t(opt.descKey)}
                  onClick={() => setFrequency(opt.value)}
                />
              ))}
            </div>
            <p className="text-xs text-ink-muted">
              {t('onboarding.frequency.hint')}
            </p>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 pt-8">
        {step === 'welcome' && (
          <Button onClick={() => setStep('name')}>{t('onboarding.btn.getStarted')}</Button>
        )}
        {step === 'name' && (
          <Button
            disabled={!canContinueName}
            onClick={() => setStep('skill')}
          >
            {t('common.continue')}
          </Button>
        )}
        {step === 'skill' && (
          <Button onClick={() => setStep('frequency')}>{t('common.continue')}</Button>
        )}
        {step === 'frequency' && (
          <Button disabled={submitting} onClick={finish}>
            {submitting ? t('common.saving') : t('onboarding.btn.finish')}
          </Button>
        )}
        <StepDots step={step} />
      </div>
    </main>
  );
}

function StepDots({ step }: { step: Step }) {
  const order: Step[] = ['welcome', 'name', 'skill', 'frequency'];
  const idx = order.indexOf(step);
  return (
    <div className="flex justify-center gap-1.5 pt-1">
      {order.map((_, i) => (
        <span
          key={i}
          className={`h-1.5 w-6 rounded-full transition ${
            i <= idx ? 'bg-primary' : 'bg-black/10'
          }`}
        />
      ))}
    </div>
  );
}
