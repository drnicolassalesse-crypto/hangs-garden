import { useCallback, useEffect, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../ui/Button';
import { Field, TextInput } from '../../ui/Field';
import { fertilizersRepo, imagesRepo } from '../../data/repositories';
import type { Fertilizer, FertilizerType, UUID } from '../../domain/types';
import { t } from '../../i18n';

const TYPES: { value: FertilizerType; i18nKey: string }[] = [
  { value: 'liquid', i18nKey: 'fertilizers.liquid' },
  { value: 'granular', i18nKey: 'fertilizers.granular' },
  { value: 'slow_release', i18nKey: 'fertilizers.slow_release' },
  { value: 'organic', i18nKey: 'fertilizers.organic' },
  { value: 'other', i18nKey: 'fertilizers.other' },
];

export function FertilizerForm() {
  const navigate = useNavigate();
  const { fertilizerId } = useParams<{ fertilizerId?: string }>();
  const editing = Boolean(fertilizerId);

  const [existing, setExisting] = useState<Fertilizer | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<FertilizerType>('liquid');
  const [npk, setNpk] = useState('');
  const [notes, setNotes] = useState('');
  const [photoBlobId, setPhotoBlobId] = useState<UUID | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(editing);

  const load = useCallback(async () => {
    if (!fertilizerId) {
      setLoading(false);
      return;
    }
    const f = await fertilizersRepo.getById(fertilizerId);
    if (f) {
      setExisting(f);
      setName(f.name);
      setType(f.type);
      setNpk(f.npk ?? '');
      setNotes(f.notes ?? '');
      setPhotoBlobId(f.photo_blob_id);
      if (f.photo_blob_id) {
        setPhotoUrl(await imagesRepo.objectUrl(f.photo_blob_id));
      }
    }
    setLoading(false);
  }, [fertilizerId]);

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

  async function uploadPhoto(file: File | null) {
    if (!file) return;
    const id = await imagesRepo.put(file);
    setPhotoBlobId(id);
  }

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const input = {
        name,
        type,
        npk: npk.trim() || null,
        notes: notes.trim() || null,
        photo_blob_id: photoBlobId,
      };
      if (editing && fertilizerId) {
        await fertilizersRepo.update(fertilizerId, input);
      } else {
        await fertilizersRepo.create(input);
      }
      navigate('/fertilizers');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!existing) return;
    if (!window.confirm(`Delete "${existing.name}"?`)) return;
    await fertilizersRepo.delete(existing.id);
    navigate('/fertilizers');
  }

  if (loading) return <main className="p-6 text-ink-muted">{t('common.loading')}</main>;

  return (
    <main className="mx-auto max-w-md p-4 pb-24">
      <header className="mb-4 flex items-center justify-between">
        <NavLink to="/fertilizers" className="text-sm text-primary underline">
          {t('fertilizerForm.back')}
        </NavLink>
        <h1 className="font-display text-lg font-semibold text-primary">
          {editing ? t('fertilizerForm.editHeading') : t('fertilizerForm.newHeading')}
        </h1>
        <span />
      </header>

      <div className="flex flex-col gap-4">
        <Field label={t('fertilizerForm.name')}>
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('fertilizerForm.name.placeholder')}
            autoFocus
          />
        </Field>

        <Field label={t('fertilizerForm.type')}>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as FertilizerType)}
            className="rounded-xl border border-black/10 bg-card px-3 py-2 text-sm"
          >
            {TYPES.map((tp) => (
              <option key={tp.value} value={tp.value}>
                {t(tp.i18nKey)}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('fertilizerForm.npk')} hint={t('fertilizerForm.npk.hint')}>
          <TextInput
            value={npk}
            onChange={(e) => setNpk(e.target.value)}
            placeholder={t('fertilizerForm.npk.placeholder')}
          />
        </Field>

        <Field label={t('fertilizerForm.notes')}>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('fertilizerForm.notes.placeholder')}
            className="rounded-xl border border-black/10 bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </Field>

        <Field label={t('fertilizerForm.photo')}>
          <div className="flex items-center gap-3">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt=""
                className="h-20 w-20 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-primary/10 text-3xl">
                🧪
              </div>
            )}
            <label className="cursor-pointer rounded-full border border-primary/30 px-4 py-2 text-sm text-primary">
              {photoUrl ? t('common.replace') : t('common.upload')}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => uploadPhoto(e.target.files?.[0] ?? null)}
              />
            </label>
            {photoUrl && (
              <button
                type="button"
                onClick={() => setPhotoBlobId(null)}
                className="text-sm text-ink-muted underline"
              >
                {t('common.remove')}
              </button>
            )}
          </div>
        </Field>

        {editing && (
          <button
            type="button"
            onClick={confirmDelete}
            className="self-start rounded-full border border-overdue/40 px-4 py-2 text-sm text-overdue"
          >
            {t('fertilizerForm.deleteBtn')}
          </button>
        )}
      </div>

      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-black/5 bg-surface/90 p-4 backdrop-blur">
        <Button
          className="w-full"
          disabled={saving || !name.trim()}
          onClick={submit}
        >
          {saving ? t('common.saving') : editing ? t('common.saveChanges') : t('fertilizerForm.createBtn')}
        </Button>
      </div>
    </main>
  );
}
