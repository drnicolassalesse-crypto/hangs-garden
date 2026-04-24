import { useCallback, useEffect, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../ui/Button';
import { ChoiceCard, Field, TextInput } from '../../ui/Field';
import { imagesRepo, speciesRepo } from '../../data/repositories';
import type {
  CareDefaults,
  Difficulty,
  LightRequirement,
  PlantSpecies,
  Toxicity,
  UUID,
} from '../../domain/types';
import {
  createCustomSpecies,
  deleteCustomSpecies,
  updateCustomSpecies,
  type CustomSpeciesInput,
} from './speciesActions';
import { t } from '../../i18n';

const DIFFICULTY: Difficulty[] = ['easy', 'moderate', 'hard'];
const LIGHT: LightRequirement[] = ['low', 'medium', 'bright_indirect', 'direct'];
const TOXICITY: Toxicity[] = [
  'non_toxic',
  'toxic_to_pets',
  'toxic_to_humans',
  'toxic_to_all',
];

const DEFAULTS: CareDefaults = {
  watering_interval_days: 7,
  fertilizing_interval_days: 21,
  misting_interval_days: 7,
  repotting_interval_days: 365,
  pruning_interval_days: 60,
  cleaning_interval_days: 60,
};

const CARE_FIELDS: {
  key: keyof CareDefaults;
  i18nKey: string;
  emoji: string;
}[] = [
  { key: 'watering_interval_days', i18nKey: 'speciesForm.careWatering', emoji: '💧' },
  { key: 'fertilizing_interval_days', i18nKey: 'speciesForm.careFertilizing', emoji: '🌿' },
  { key: 'misting_interval_days', i18nKey: 'speciesForm.careMisting', emoji: '🌫️' },
  { key: 'repotting_interval_days', i18nKey: 'speciesForm.careRepotting', emoji: '🪴' },
  { key: 'pruning_interval_days', i18nKey: 'speciesForm.carePruning', emoji: '✂️' },
  { key: 'cleaning_interval_days', i18nKey: 'speciesForm.careCleaning', emoji: '🧹' },
];

function readVietnameseName(tags: string[] | undefined): string {
  if (!tags) return '';
  const tag = tags.find((x) => x.startsWith('vi_name:'));
  return tag ? tag.slice('vi_name:'.length) : '';
}

export function CustomSpeciesForm() {
  const navigate = useNavigate();
  const { speciesId } = useParams<{ speciesId?: string }>();
  const editing = Boolean(speciesId);

  const [loading, setLoading] = useState(editing);
  const [existing, setExisting] = useState<PlantSpecies | null>(null);
  const [commonName, setCommonName] = useState('');
  const [viName, setViName] = useState('');
  const [scientific, setScientific] = useState('');
  const [family, setFamily] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('moderate');
  const [light, setLight] = useState<LightRequirement>('bright_indirect');
  const [toxicity, setToxicity] = useState<Toxicity>('non_toxic');
  const [photoBlobId, setPhotoBlobId] = useState<UUID | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [intervals, setIntervals] = useState<CareDefaults>(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!speciesId) {
      setLoading(false);
      return;
    }
    const sp = await speciesRepo.getById(speciesId);
    if (!sp || !sp.is_custom) {
      setError(t('speciesForm.cannotEdit'));
      setLoading(false);
      return;
    }
    setExisting(sp);
    setCommonName(sp.common_name);
    setViName(readVietnameseName(sp.tags));
    setScientific(sp.scientific_name);
    setFamily(sp.family);
    setDescription(sp.description);
    setDifficulty(sp.difficulty);
    setLight(sp.light_requirement);
    setToxicity(sp.toxicity);
    setPhotoBlobId(sp.image_blob_id ?? null);
    setIntervals(sp.care_defaults);
    if (sp.image_blob_id) {
      setPhotoUrl(await imagesRepo.objectUrl(sp.image_blob_id));
    }
    setLoading(false);
  }, [speciesId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!photoBlobId) {
      setPhotoUrl(null);
      return;
    }
    imagesRepo.objectUrl(photoBlobId).then(setPhotoUrl);
  }, [photoBlobId]);

  async function handlePhoto(file: File | null) {
    if (!file) return;
    const id = await imagesRepo.put(file);
    setPhotoBlobId(id);
  }

  async function removePhoto() {
    if (!photoBlobId) return;
    const blobId = photoBlobId;
    setPhotoBlobId(null);
    try {
      await imagesRepo.delete(blobId);
    } catch {
      /* noop */
    }
  }

  function updateInterval(key: keyof CareDefaults, v: string) {
    const n = Math.max(1, Math.round(Number(v) || 1));
    setIntervals((prev) => ({ ...prev, [key]: n }));
  }

  async function submit() {
    if (!commonName.trim()) {
      setError('Common name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    const input: CustomSpeciesInput = {
      common_name: commonName,
      scientific_name: scientific,
      vi_name: viName,
      family,
      description,
      image_blob_id: photoBlobId,
      difficulty,
      light_requirement: light,
      toxicity,
      care_defaults: intervals,
    };
    try {
      if (editing && speciesId) {
        await updateCustomSpecies(speciesId, input);
      } else {
        await createCustomSpecies(input);
      }
      navigate('/species');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!existing) return;
    if (!window.confirm(`Delete "${existing.common_name}"?`)) return;
    await deleteCustomSpecies(existing.id);
    navigate('/species');
  }

  if (loading) {
    return <main className="p-6 text-ink-muted">{t('common.loading')}</main>;
  }

  return (
    <main className="mx-auto max-w-md p-4 pb-24">
      <header className="mb-4 flex items-center justify-between">
        <NavLink to="/species" className="text-sm text-primary underline">
          {t('speciesForm.back')}
        </NavLink>
        <h1 className="font-display text-lg font-semibold text-primary">
          {editing ? t('speciesForm.editHeading') : t('speciesForm.newHeading')}
        </h1>
        <span />
      </header>

      {error && (
        <div className="mb-3 rounded-xl bg-overdue/10 p-3 text-sm text-overdue">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <Field label={t('speciesForm.commonName')}>
          <TextInput
            value={commonName}
            onChange={(e) => setCommonName(e.target.value)}
            placeholder={t('speciesForm.commonName.placeholder')}
            autoFocus
          />
        </Field>

        <Field label={t('speciesForm.vnName')} hint={t('speciesForm.vnName.hint')}>
          <TextInput
            value={viName}
            onChange={(e) => setViName(e.target.value)}
            placeholder={t('speciesForm.vnName.placeholder')}
          />
        </Field>

        <Field label={t('speciesForm.sciName')}>
          <TextInput
            value={scientific}
            onChange={(e) => setScientific(e.target.value)}
            placeholder={t('speciesForm.sciName.placeholder')}
          />
        </Field>

        <Field label={t('speciesForm.family')}>
          <TextInput
            value={family}
            onChange={(e) => setFamily(e.target.value)}
            placeholder={t('speciesForm.family.placeholder')}
          />
        </Field>

        <Field label={t('speciesForm.description')}>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('speciesForm.description.placeholder')}
            className="rounded-xl border border-black/10 bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </Field>

        <Field label={t('speciesForm.photo')}>
          <div className="flex items-center gap-3">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt=""
                className="h-16 w-16 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-2xl">
                🌿
              </div>
            )}
            <label className="cursor-pointer rounded-full border border-primary/30 px-4 py-2 text-sm text-primary">
              {photoUrl ? t('common.replace') : t('common.upload')}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePhoto(e.target.files?.[0] ?? null)}
              />
            </label>
            {photoUrl && (
              <button
                type="button"
                onClick={removePhoto}
                className="text-sm text-ink-muted underline"
              >
                {t('common.remove')}
              </button>
            )}
          </div>
        </Field>

        <Field label={t('speciesForm.difficulty')}>
          <div className="flex gap-2">
            {DIFFICULTY.map((d) => (
              <ChoiceCard
                key={d}
                selected={difficulty === d}
                title={d}
                description=""
                onClick={() => setDifficulty(d)}
              />
            ))}
          </div>
        </Field>

        <Field label={t('speciesForm.preferredLight')}>
          <select
            value={light}
            onChange={(e) => setLight(e.target.value as LightRequirement)}
            className="rounded-xl border border-black/10 bg-card px-3 py-2 text-sm"
          >
            {LIGHT.map((l) => (
              <option key={l} value={l}>
                {l.replace('_', ' ')}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('speciesForm.toxicity')}>
          <select
            value={toxicity}
            onChange={(e) => setToxicity(e.target.value as Toxicity)}
            className="rounded-xl border border-black/10 bg-card px-3 py-2 text-sm"
          >
            {TOXICITY.map((tx) => (
              <option key={tx} value={tx}>
                {tx.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </Field>

        <section>
          <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-ink-muted">
            {t('speciesForm.careIntervals')}
          </h3>
          <ul className="flex flex-col gap-2">
            {CARE_FIELDS.map((cf) => (
              <li
                key={cf.key}
                className="flex items-center gap-3 rounded-xl bg-card p-2 shadow-sm"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-lg">
                  {cf.emoji}
                </div>
                <div className="flex-1 text-sm">{t(cf.i18nKey)}</div>
                <input
                  type="number"
                  min={1}
                  value={intervals[cf.key]}
                  onChange={(e) => updateInterval(cf.key, e.target.value)}
                  className="w-16 rounded-lg border border-black/10 bg-card px-2 py-1 text-right text-sm"
                />
                <span className="text-xs text-ink-muted">{t('common.dSuffix')}</span>
              </li>
            ))}
          </ul>
        </section>

        {editing && (
          <button
            type="button"
            onClick={confirmDelete}
            className="self-start rounded-full border border-overdue/40 px-4 py-2 text-sm text-overdue"
          >
            {t('speciesForm.deleteSpecies')}
          </button>
        )}
      </div>

      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-black/5 bg-surface/90 p-4 backdrop-blur">
        <Button className="w-full" disabled={saving} onClick={submit}>
          {saving ? t('common.saving') : editing ? t('common.saveChanges') : t('speciesForm.createSpecies')}
        </Button>
      </div>
    </main>
  );
}
