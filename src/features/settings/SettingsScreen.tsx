import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useProfileStore } from '../../state/profileStore';
import { ChoiceCard, Field, TextInput } from '../../ui/Field';
import { Button } from '../../ui/Button';
import type {
  NotificationFrequency,
  SkillLevel,
} from '../../domain/types';
import {
  notificationPermission,
  requestPermission,
  syncNotifications,
} from '../../services/notifications';
import {
  careLogsRepo,
  potsRepo,
  speciesRepo,
} from '../../data/repositories';
import { PlantaDB, __setDB } from '../../data/db';
import { downloadCsv, toCareHistoryCSV } from './csvExport';
import { t, useLocale, setLocale, type Locale } from '../../i18n';

const APP_VERSION = '0.0.1';

const SKILLS: { value: SkillLevel; titleKey: string; descKey: string }[] = [
  { value: 'beginner', titleKey: 'settings.profile.skill.beginner', descKey: 'settings.profile.skill.beginner.desc' },
  { value: 'intermediate', titleKey: 'settings.profile.skill.intermediate', descKey: 'settings.profile.skill.intermediate.desc' },
  { value: 'expert', titleKey: 'settings.profile.skill.expert', descKey: 'settings.profile.skill.expert.desc' },
];

const FREQUENCIES: {
  value: NotificationFrequency;
  titleKey: string;
  descKey: string;
}[] = [
  { value: 'minimal', titleKey: 'settings.profile.freq.minimal', descKey: 'settings.profile.freq.minimal.desc' },
  { value: 'moderate', titleKey: 'settings.profile.freq.moderate', descKey: 'settings.profile.freq.moderate.desc' },
  { value: 'frequent', titleKey: 'settings.profile.freq.frequent', descKey: 'settings.profile.freq.frequent.desc' },
];

export function SettingsScreen() {
  const locale = useLocale();
  const profile = useProfileStore((s) => s.profile);
  const save = useProfileStore((s) => s.save);

  const [name, setName] = useState('');
  const [skill, setSkill] = useState<SkillLevel>('beginner');
  const [frequency, setFrequency] = useState<NotificationFrequency>('moderate');
  const [reminder, setReminder] = useState('08:00');
  const [perm, setPerm] = useState<ReturnType<typeof notificationPermission>>(
    notificationPermission(),
  );
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>(
    'idle',
  );

  useEffect(() => {
    if (!profile) return;
    setName(profile.display_name);
    setSkill(profile.skill_level);
    setFrequency(profile.notification_frequency);
    setReminder(profile.reminder_time);
  }, [profile]);

  async function saveProfile() {
    setSavingState('saving');
    try {
      const trimmed = name.trim() || 'You';
      await save({
        display_name: trimmed,
        skill_level: skill,
        notification_frequency: frequency,
      });
      if (profile) {
        const { profileRepo } = await import('../../data/repositories');
        await profileRepo.upsert({
          ...profile,
          display_name: trimmed,
          skill_level: skill,
          notification_frequency: frequency,
          reminder_time: reminder,
        });
        await useProfileStore.getState().load();
      }
      await syncNotifications();
      setSavingState('saved');
      setTimeout(() => setSavingState('idle'), 1200);
    } catch {
      setSavingState('idle');
    }
  }

  async function enableNotifications() {
    const r = await requestPermission();
    setPerm(r);
    if (r === 'granted') await syncNotifications();
  }

  async function testReminder() {
    if (notificationPermission() !== 'granted') {
      alert(t('settings.notifications.enableFirst'));
      return;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const title = t('settings.notifications.testTitle');
      const opts: NotificationOptions = {
        body: t('settings.notifications.testBody'),
        icon: '/icons/icon-192.png',
      };
      if (reg) await reg.showNotification(title, opts);
      else new Notification(title, opts);
    } catch (err) {
      console.error(err);
      alert(t('settings.notifications.testFailed'));
    }
  }

  async function exportCsv() {
    const [logs, pots, species] = await Promise.all([
      careLogsRepo.listAllForExport(),
      potsRepo.listAll(),
      speciesRepo.listAll(),
    ]);
    const csv = toCareHistoryCSV(
      logs,
      new Map(pots.map((p) => [p.id, p])),
      new Map(species.map((s) => [s.id, s])),
    );
    downloadCsv(`hangs-garden-care-history-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  async function resetEverything() {
    if (!window.confirm(t('settings.danger.confirm1')))
      return;
    if (!window.confirm(t('settings.danger.confirm2')))
      return;
    const dbName = 'planta';
    const dbToClose = new PlantaDB(dbName);
    await dbToClose.delete();
    __setDB(null);
    try {
      localStorage.removeItem('planta.seed.version');
      localStorage.removeItem('planta.notifBanner.dismissed');
    } catch {
      /* noop */
    }
    window.location.href = '/';
  }

  // Force re-evaluation of translated option arrays when locale changes
  void locale;

  return (
    <main className="mx-auto max-w-md p-4 pb-12">
      <header className="mb-4 flex items-center justify-between">
        <NavLink to="/" className="text-sm text-primary underline">
          {t('settings.back')}
        </NavLink>
        <h1 className="font-display text-xl font-bold text-primary">
          {t('settings.heading')}
        </h1>
        <span />
      </header>

      {/* Language */}
      <section className="mb-6 rounded-2xl bg-card p-4 shadow-sm">
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-ink-muted">
          {t('settings.language.heading')}
        </h2>
        <div className="flex gap-2">
          {(['vi', 'en'] as Locale[]).map((l) => (
            <button
              key={l}
              onClick={() => setLocale(l)}
              className={`flex-1 rounded-full border px-4 py-2 text-sm font-medium transition ${
                locale === l
                  ? 'border-primary bg-primary text-white'
                  : 'border-black/10 bg-card text-ink'
              }`}
            >
              {l === 'vi' ? 'Tiếng Việt' : 'English'}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-6 flex flex-col gap-4 rounded-2xl bg-card p-4 shadow-sm">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink-muted">
          {t('settings.profile.heading')}
        </h2>
        <Field label={t('settings.profile.displayName')}>
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
          />
        </Field>

        <div>
          <div className="mb-1 text-sm font-medium">{t('settings.profile.skillLevel')}</div>
          <div className="flex flex-col gap-2">
            {SKILLS.map((o) => (
              <ChoiceCard
                key={o.value}
                selected={skill === o.value}
                title={t(o.titleKey)}
                description={t(o.descKey)}
                onClick={() => setSkill(o.value)}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 text-sm font-medium">{t('settings.profile.notifFrequency')}</div>
          <div className="flex flex-col gap-2">
            {FREQUENCIES.map((o) => (
              <ChoiceCard
                key={o.value}
                selected={frequency === o.value}
                title={t(o.titleKey)}
                description={t(o.descKey)}
                onClick={() => setFrequency(o.value)}
              />
            ))}
          </div>
        </div>

        <Field label={t('settings.profile.reminderTime')}>
          <TextInput
            type="time"
            value={reminder}
            onChange={(e) => setReminder(e.target.value)}
          />
        </Field>

        <Button className="self-end" onClick={saveProfile} disabled={savingState === 'saving'}>
          {savingState === 'saving'
            ? t('common.saving')
            : savingState === 'saved'
              ? t('common.saved')
              : t('settings.profile.saveBtn')}
        </Button>
      </section>

      <section className="mb-6 rounded-2xl bg-card p-4 shadow-sm">
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-ink-muted">
          {t('settings.notifications.heading')}
        </h2>
        <p className="text-sm">
          {t('settings.notifications.status')}{' '}
          <strong
            className={
              perm === 'granted'
                ? 'text-success'
                : perm === 'denied'
                  ? 'text-overdue'
                  : 'text-ink-muted'
            }
          >
            {perm === 'granted'
              ? t('settings.notifications.enabled')
              : perm === 'denied'
                ? t('settings.notifications.blocked')
                : perm === 'unsupported'
                  ? t('settings.notifications.unsupported')
                  : t('settings.notifications.notEnabled')}
          </strong>
        </p>
        {perm === 'default' && (
          <Button className="mt-2" onClick={enableNotifications}>
            {t('settings.notifications.enableBtn')}
          </Button>
        )}
        {perm === 'granted' && (
          <button
            type="button"
            onClick={testReminder}
            className="mt-2 rounded-full border border-primary/30 px-4 py-2 text-sm text-primary"
          >
            {t('settings.notifications.testBtn')}
          </button>
        )}
        <p className="mt-2 text-xs text-ink-muted">
          {t('settings.notifications.iosHint')}
        </p>
      </section>

      <section className="mb-6 rounded-2xl bg-card p-4 shadow-sm">
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-ink-muted">
          {t('settings.library.heading')}
        </h2>
        <div className="flex flex-wrap gap-2">
          <NavLink
            to="/species"
            className="rounded-full border border-primary/30 px-4 py-2 text-sm text-primary"
          >
            {t('settings.library.species')}
          </NavLink>
          <NavLink
            to="/fertilizers"
            className="rounded-full border border-primary/30 px-4 py-2 text-sm text-primary"
          >
            {t('settings.library.fertilizers')}
          </NavLink>
        </div>
      </section>

      <section className="mb-6 rounded-2xl bg-card p-4 shadow-sm">
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-ink-muted">
          {t('settings.data.heading')}
        </h2>
        <button
          type="button"
          onClick={exportCsv}
          className="rounded-full border border-primary/30 px-4 py-2 text-sm text-primary"
        >
          {t('settings.data.export')}
        </button>
        <p className="mt-2 text-xs text-ink-muted">
          {t('settings.data.hint')}
        </p>
      </section>

      <section className="mb-6 rounded-2xl bg-card p-4 shadow-sm">
        <h2 className="mb-1 font-display text-sm font-semibold uppercase tracking-wide text-ink-muted">
          {t('settings.about.heading')}
        </h2>
        <p className="text-sm text-ink">{t('settings.about.version', { version: APP_VERSION })}</p>
        <p className="mt-1 text-xs text-ink-muted">
          {t('settings.about.tagline')}
        </p>
      </section>

      <section className="rounded-2xl border border-overdue/30 bg-card p-4 shadow-sm">
        <h2 className="font-display text-sm font-semibold text-overdue">
          {t('settings.danger.heading')}
        </h2>
        <p className="mt-1 text-xs text-ink-muted">
          {t('settings.danger.body')}
        </p>
        <button
          type="button"
          onClick={resetEverything}
          className="mt-3 rounded-full border border-overdue/40 px-4 py-2 text-sm text-overdue"
        >
          {t('settings.danger.resetBtn')}
        </button>
      </section>
    </main>
  );
}
