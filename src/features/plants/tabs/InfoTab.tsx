import { NavLink, useNavigate } from 'react-router-dom';
import type { PlantSpecies, Pot } from '../../../domain/types';
import { t, getLocale } from '../../../i18n';
import { deletePot } from '../actions';

export function InfoTab({
  pot,
  species,
}: {
  pot: Pot;
  species: PlantSpecies | null;
}) {
  const navigate = useNavigate();

  async function confirmDelete() {
    const sure = window.confirm(
      t('info.confirmDelete', { name: pot.display_name }),
    );
    if (!sure) return;
    await deletePot(pot.id);
    navigate('/plants');
  }

  return (
    <div className="flex flex-col gap-5">
      {species && (
        <section className="rounded-2xl bg-card p-4 shadow-sm">
          <h3 className="font-display text-base font-semibold text-ink">
            {t('info.about', { name: species.common_name })}
          </h3>
          <p className="text-sm italic text-ink-muted">
            {species.scientific_name} · {species.family}
          </p>
          <p className="mt-2 text-sm text-ink">{species.description}</p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <Row label={t('info.difficulty')} value={species.difficulty} />
            <Row
              label={t('info.preferredLight')}
              value={species.light_requirement.replace('_', ' ')}
            />
            <Row
              label={t('info.toxicity')}
              value={species.toxicity.replace(/_/g, ' ')}
            />
            <Row label={t('info.tags')} value={humanTags(species.tags)} />
          </dl>
        </section>
      )}

      <section className="rounded-2xl bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-ink">
            {t('info.potParams')}
          </h3>
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              pot.use_custom_schedule
                ? 'bg-warning/20 text-warning'
                : 'bg-primary/10 text-primary'
            }`}
          >
            {pot.use_custom_schedule ? t('info.customSchedule') : t('info.autoSchedule')}
          </span>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <Row label={t('info.size')} value={pot.pot_size.toUpperCase()} />
          <Row label={t('info.material')} value={pot.pot_material} />
          <Row label={t('info.soil')} value={pot.soil_type.replace(/_/g, ' ')} />
          <Row label={t('info.light')} value={pot.light_level.replace(/_/g, ' ')} />
          <Row label={t('info.location')} value={pot.location_type} />
          <Row
            label={t('info.added')}
            value={new Date(pot.created_at).toLocaleDateString(getLocale())}
          />
        </dl>
        <NavLink
          to="edit"
          relative="path"
          className="mt-3 inline-block rounded-full border border-primary/30 px-4 py-2 text-sm text-primary"
        >
          {t('info.editPot')}
        </NavLink>
      </section>

      <section className="rounded-2xl border border-overdue/30 bg-card p-4 shadow-sm">
        <h3 className="text-sm font-medium text-overdue">{t('info.dangerZone')}</h3>
        <p className="mt-1 text-xs text-ink-muted">
          {t('info.deleteWarning')}
        </p>
        <button
          type="button"
          onClick={confirmDelete}
          className="mt-3 rounded-full border border-overdue/40 px-4 py-2 text-sm text-overdue"
        >
          {t('info.deletePlant')}
        </button>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-ink-muted">
        {label}
      </dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

function humanTags(tags: string[]): string {
  const rendered = tags
    .filter((t) => !t.startsWith('vi_name:'))
    .join(', ');
  return rendered || '—';
}
