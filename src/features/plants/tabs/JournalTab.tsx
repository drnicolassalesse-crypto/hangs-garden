import { useEffect, useState } from 'react';
import { imagesRepo } from '../../../data/repositories';
import type { JournalEntry, UUID } from '../../../domain/types';
import { t, getLocale } from '../../../i18n';
import { JournalComposer } from '../../journal/JournalComposer';
import { deleteEntry } from '../../journal/actions';

export function JournalTab({
  potId,
  entries,
  onMutated,
}: {
  potId: UUID;
  entries: JournalEntry[];
  onMutated: () => void;
}) {
  const [composing, setComposing] = useState(false);

  if (entries.length === 0) {
    return (
      <div>
        <div className="rounded-2xl border-2 border-dashed border-black/10 p-6 text-center">
          <div className="mb-2 text-3xl">📓</div>
          <p className="mb-3 text-sm text-ink-muted">
            {t('journal.empty')}
          </p>
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="rounded-full bg-primary px-4 py-2 text-sm text-white"
          >
            {t('journal.addEntry')}
          </button>
        </div>
        {composing && (
          <JournalComposer
            potId={potId}
            onClose={() => setComposing(false)}
            onSaved={onMutated}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <ul className="flex flex-col gap-3">
        {entries.map((e) => (
          <EntryCard
            key={e.id}
            entry={e}
            potId={potId}
            onDeleted={onMutated}
          />
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setComposing(true)}
        className="mt-4 w-full rounded-full border border-dashed border-primary/40 px-4 py-2 text-sm text-primary"
      >
        {t('journal.addEntry')}
      </button>
      {composing && (
        <JournalComposer
          potId={potId}
          onClose={() => setComposing(false)}
          onSaved={onMutated}
        />
      )}
    </div>
  );
}

function EntryCard({
  entry,
  potId,
  onDeleted,
}: {
  entry: JournalEntry;
  potId: UUID;
  onDeleted: () => void;
}) {
  const [urls, setUrls] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      const resolved = await Promise.all(
        entry.photo_blob_ids.map((id) => imagesRepo.objectUrl(id)),
      );
      setUrls(resolved.filter((u): u is string => !!u));
    })();
  }, [entry.photo_blob_ids]);

  async function confirmDelete() {
    setMenuOpen(false);
    if (!window.confirm(t('journal.confirmDelete'))) return;
    await deleteEntry(entry.id, potId);
    onDeleted();
  }

  return (
    <li className="relative rounded-2xl bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="text-xs text-ink-muted">
          {new Date(entry.created_at).toLocaleDateString(getLocale())}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((s) => !s)}
            className="rounded-full px-2 text-ink-muted hover:bg-black/5"
            aria-label={t('journal.entryMenu')}
          >
            ⋮
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 rounded-xl border border-black/10 bg-card p-1 shadow-lg">
              <button
                type="button"
                onClick={confirmDelete}
                className="block w-full rounded-lg px-3 py-1.5 text-left text-sm text-overdue hover:bg-overdue/10"
              >
                {t('common.delete')}
              </button>
            </div>
          )}
        </div>
      </div>
      {entry.content && (
        <p className="mt-1 whitespace-pre-wrap text-sm">{entry.content}</p>
      )}
      {urls.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {urls.map((u, i) => (
            <img
              key={i}
              src={u}
              alt=""
              className="h-20 w-20 rounded-lg object-cover"
            />
          ))}
        </div>
      )}
      {entry.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {entry.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
            >
              {t.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}
    </li>
  );
}
