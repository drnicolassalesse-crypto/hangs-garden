import { useEffect, useState } from 'react';
import { Field, TextInput } from '../../../ui/Field';
import { Button } from '../../../ui/Button';
import { t } from '../../../i18n';
import { imagesRepo, sitesRepo } from '../../../data/repositories';
import type { PlantSpecies, Site } from '../../../domain/types';
import type { AddPlantDraft } from '../draft';

export function StepName({
  draft,
  species,
  onChange,
}: {
  draft: AddPlantDraft;
  species: PlantSpecies;
  onChange: (patch: Partial<AddPlantDraft>) => void;
}) {
  const [sites, setSites] = useState<Site[]>([]);
  const [creatingSite, setCreatingSite] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteIcon, setNewSiteIcon] = useState('🪴');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    sitesRepo.listAll().then(setSites);
  }, []);

  useEffect(() => {
    if (!draft.photo_blob_id) {
      setPhotoUrl(null);
      return;
    }
    imagesRepo.objectUrl(draft.photo_blob_id).then(setPhotoUrl);
  }, [draft.photo_blob_id]);

  // pre-fill display name with species common name on first render
  useEffect(() => {
    if (!draft.display_name) onChange({ display_name: species.common_name });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFile(file: File | null) {
    if (!file) return;
    const id = await imagesRepo.put(file);
    onChange({ photo_blob_id: id });
  }

  async function createSite() {
    const name = newSiteName.trim();
    if (!name) return;
    const site = await sitesRepo.create({ name, icon: newSiteIcon });
    setSites((prev) => [...prev, site]);
    onChange({ site_id: site.id });
    setCreatingSite(false);
    setNewSiteName('');
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-display text-2xl font-semibold text-ink">
        {t('addPlant.name.heading')}
      </h2>

      <Field label={t('addPlant.name.label')}>
        <TextInput
          value={draft.display_name}
          onChange={(e) => onChange({ display_name: e.target.value })}
          maxLength={60}
        />
      </Field>

      <Field label={t('addPlant.name.photo')}>
        <div className="flex items-center gap-3">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt=""
              className="h-16 w-16 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-2xl">
              🪴
            </div>
          )}
          <label className="cursor-pointer rounded-full border border-primary/30 px-4 py-2 text-sm text-primary">
            {photoUrl ? t('common.replace') : t('common.upload')}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {photoUrl && (
            <button
              type="button"
              onClick={() => onChange({ photo_blob_id: null })}
              className="text-sm text-ink-muted underline"
            >
              {t('common.remove')}
            </button>
          )}
        </div>
      </Field>

      <Field label={t('addPlant.name.site')}>
        <div className="flex flex-wrap gap-2">
          <SiteChip
            label={t('common.none')}
            icon="—"
            selected={draft.site_id === null}
            onClick={() => onChange({ site_id: null })}
          />
          {sites.map((s) => (
            <SiteChip
              key={s.id}
              label={s.name}
              icon={s.icon}
              selected={draft.site_id === s.id}
              onClick={() => onChange({ site_id: s.id })}
            />
          ))}
          {!creatingSite && (
            <button
              type="button"
              onClick={() => setCreatingSite(true)}
              className="rounded-full border border-dashed border-primary/50 px-3 py-1.5 text-sm text-primary"
            >
              {t('addPlant.name.newSite')}
            </button>
          )}
        </div>
        {creatingSite && (
          <div className="mt-3 flex gap-2">
            <TextInput
              value={newSiteIcon}
              onChange={(e) => setNewSiteIcon(e.target.value)}
              maxLength={2}
              className="w-14 text-center"
            />
            <TextInput
              value={newSiteName}
              onChange={(e) => setNewSiteName(e.target.value)}
              placeholder={t('addPlant.name.sitePlaceholder')}
              className="flex-1"
            />
            <Button variant="secondary" onClick={createSite}>
              {t('addPlant.name.addSite')}
            </Button>
          </div>
        )}
      </Field>
    </div>
  );
}

function SiteChip({
  label,
  icon,
  selected,
  onClick,
}: {
  label: string;
  icon: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm transition ${
        selected
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-black/10 bg-card text-ink hover:border-primary/40'
      }`}
    >
      <span className="mr-1">{icon}</span>
      {label}
    </button>
  );
}
