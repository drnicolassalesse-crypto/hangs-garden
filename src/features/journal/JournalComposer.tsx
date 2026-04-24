import { useEffect, useState } from 'react';
import { imagesRepo } from '../../data/repositories';
import type { UUID } from '../../domain/types';
import { Button } from '../../ui/Button';
import { cleanupOrphanedImages, createEntry } from './actions';
import { t } from '../../i18n';

const TAGS = [
  'new_growth',
  'repotted',
  'pest_spotted',
  'pruned',
  'blooming',
  'wilting',
  'other',
] as const;

const MAX_PHOTOS = 5;

function todayYYYYMMDD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fromYYYYMMDD(v: string): number {
  const d = new Date(v);
  d.setHours(12, 0, 0, 0);
  return d.getTime();
}

interface UploadedPhoto {
  blob_id: UUID;
  url: string;
}

export function JournalComposer({
  potId,
  onClose,
  onSaved,
}: {
  potId: UUID;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [date, setDate] = useState(todayYYYYMMDD());
  const [saving, setSaving] = useState(false);

  // If the user closes without saving, clean up orphaned uploaded blobs.
  // We only clean up on explicit discard; browser-tab-close will leave them
  // as orphans which a future maintenance task can reap.
  const [discarded, setDiscarded] = useState(false);
  useEffect(() => {
    if (!discarded) return;
    const ids = photos.map((p) => p.blob_id);
    void cleanupOrphanedImages(ids);
    onClose();
  }, [discarded, photos, onClose]);

  async function addFiles(files: FileList | null) {
    if (!files) return;
    const room = MAX_PHOTOS - photos.length;
    const accepted = Array.from(files).slice(0, Math.max(0, room));
    const uploaded: UploadedPhoto[] = [];
    for (const f of accepted) {
      const id = await imagesRepo.put(f);
      const url = (await imagesRepo.objectUrl(id)) ?? '';
      uploaded.push({ blob_id: id, url });
    }
    setPhotos((prev) => [...prev, ...uploaded]);
  }

  async function removePhoto(blob_id: UUID) {
    setPhotos((prev) => prev.filter((p) => p.blob_id !== blob_id));
    await imagesRepo.delete(blob_id);
  }

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag],
    );
  }

  async function save() {
    setSaving(true);
    try {
      await createEntry({
        pot_id: potId,
        created_at: fromYYYYMMDD(date),
        content,
        photo_blob_ids: photos.map((p) => p.blob_id),
        tags,
      });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const canSave = content.trim().length > 0 || photos.length > 0;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end bg-black/40"
      onClick={() => setDiscarded(true)}
    >
      <div
        className="max-h-[92dvh] w-full overflow-auto rounded-t-3xl bg-card p-5 pb-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-black/10" />
        <h2 className="font-display text-xl font-semibold">{t('journalComposer.heading')}</h2>

        <label className="mt-3 block text-xs font-medium text-ink-muted">
          {t('journalComposer.date')}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={todayYYYYMMDD()}
            className="mt-1 block w-full rounded-lg border border-black/10 bg-card px-3 py-2 text-sm"
          />
        </label>

        <label className="mt-3 block text-xs font-medium text-ink-muted">
          {t('journalComposer.notes')}
          <textarea
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('journalComposer.notes.placeholder')}
            className="mt-1 block w-full resize-y rounded-xl border border-black/10 bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <div className="mt-3">
          <div className="mb-1 text-xs font-medium text-ink-muted">
            {t('journalComposer.photos', { count: photos.length, max: MAX_PHOTOS })}
          </div>
          <div className="flex flex-wrap gap-2">
            {photos.map((p) => (
              <div key={p.blob_id} className="relative">
                <img
                  src={p.url}
                  alt=""
                  className="h-16 w-16 rounded-xl object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(p.blob_id)}
                  className="absolute -right-1 -top-1 rounded-full bg-overdue px-1.5 text-xs text-white"
                  aria-label={t('common.remove')}
                >
                  ×
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-black/15 text-2xl text-ink-muted">
                +
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                />
              </label>
            )}
          </div>
        </div>

        <div className="mt-3">
          <div className="mb-1 text-xs font-medium text-ink-muted">{t('journalComposer.tags')}</div>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((tag) => {
              const on = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    on
                      ? 'border-primary bg-primary text-white'
                      : 'border-black/10 bg-card text-ink'
                  }`}
                >
                  {t('journalComposer.tag.' + tag)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setDiscarded(true)}
            disabled={saving}
          >
            {t('journalComposer.discard')}
          </Button>
          <Button
            className="flex-1"
            onClick={save}
            disabled={!canSave || saving}
          >
            {saving ? t('common.saving') : t('journalComposer.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
