import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import {
  careTasksRepo,
  potsRepo,
  sitesRepo,
  speciesRepo,
} from '../../data/repositories';
import { summarizePlants, type PlantSummary } from '../../domain/plantSummary';
import { cleanupDeletedPots, emptyLayout } from '../../domain/gardenLayout';
import type { Site, UUID } from '../../domain/types';
import { t } from '../../i18n';
import { useGardenLayoutState } from './useGardenLayoutState';
import { GardenCanvas } from './GardenCanvas';
import { LayoutToolbar } from './LayoutToolbar';
import { AreaShapePicker } from './AreaShapePicker';
import { PlantPalette } from './PlantPalette';
import { MarkerPicker } from './MarkerPicker';
import { saveLayout } from './actions';

export function GardenLayoutScreen() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();

  const [site, setSite] = useState<Site | null>(null);
  const [summaries, setSummaries] = useState<PlantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const didAutoOpen = useRef(false);

  // Load site and plant data
  const load = useCallback(async () => {
    if (!siteId) return;
    const sites = await sitesRepo.listAll();
    const mine = sites.find((s) => s.id === siteId);
    if (!mine) {
      navigate('/sites', { replace: true });
      return;
    }
    setSite(mine);

    const [pots, tasks, species] = await Promise.all([
      potsRepo.listBySite(siteId as UUID),
      careTasksRepo.listAllEnabled(),
      speciesRepo.listAll(),
    ]);

    const plantSummaries = summarizePlants({
      pots,
      tasks,
      species: new Map(species.map((s) => [s.id, s])),
      sites: new Map([[mine.id, mine]]),
      now: Date.now(),
    });
    setSummaries(plantSummaries);

    // Lazy cleanup: remove placements for deleted/moved pots
    if (mine.layout) {
      const existingIds = new Set(pots.map((p) => p.id));
      const cleaned = cleanupDeletedPots(mine.layout, existingIds);
      if (cleaned !== mine.layout) {
        await saveLayout(mine.id, cleaned);
        mine.layout = cleaned;
      }
    }

    setLoading(false);
  }, [siteId, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  // Initialize layout state once site is loaded
  const initialLayout = site?.layout ?? null;
  const state = useGardenLayoutState(siteId as UUID, initialLayout);

  // If no layout exists yet, create an empty one
  useEffect(() => {
    if (site && !site.layout && !loading) {
      const empty = emptyLayout();
      void saveLayout(site.id, empty);
      site.layout = empty;
    }
  }, [site, loading]);

  // Bottom sheet visibility
  const [showShapePicker, setShowShapePicker] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showMarkerPicker, setShowMarkerPicker] = useState(false);

  // Auto-start in edit mode and open shape picker when layout is empty
  const layoutIsEmpty =
    state.layout.areas.length === 0 &&
    state.layout.plant_placements.length === 0;

  useEffect(() => {
    if (!loading && layoutIsEmpty && !didAutoOpen.current) {
      didAutoOpen.current = true;
      state.setMode('edit_areas');
      // Small delay so the toolbar renders first
      setTimeout(() => setShowShapePicker(true), 300);
    }
  }, [loading, layoutIsEmpty, state]);

  // Plant summaries as a map for the canvas
  const summaryMap = useMemo(
    () => new Map(summaries.map((s) => [s.pot.id, s])),
    [summaries],
  );

  // Unplaced plants for the palette
  const placedPotIds = useMemo(
    () => new Set(state.layout.plant_placements.map((p) => p.pot_id)),
    [state.layout.plant_placements],
  );
  const unplacedPlants = useMemo(
    () => summaries.filter((s) => !placedPotIds.has(s.pot.id)),
    [summaries, placedPotIds],
  );

  // Canvas tap handler: place pending plant or deselect
  const handleCanvasTap = useCallback(
    (x: number, y: number) => {
      if (state.pendingPlantId) {
        state.placePlant(state.pendingPlantId, x, y);
      }
    },
    [state],
  );

  // Plant icon tap in view mode -> navigate to detail
  const handlePlantTap = useCallback(
    (potId: UUID) => {
      navigate(`/plants/${potId}`);
    },
    [navigate],
  );

  // Delete selected item based on current mode
  const handleDeleteSelected = useCallback(() => {
    if (!state.selectedId) return;
    if (state.mode === 'edit_areas') {
      state.removeArea(state.selectedId);
    } else if (state.mode === 'place_plants') {
      state.removePlant(state.selectedId);
    } else if (state.mode === 'place_markers') {
      state.removeMarker(state.selectedId);
    }
  }, [state]);

  // Add marker at center of canvas
  const handleAddMarker = useCallback(
    (type: 'water_source' | 'compass') => {
      state.addMarker(
        type,
        state.layout.canvas_width / 2,
        state.layout.canvas_height / 2,
      );
    },
    [state],
  );

  if (loading || !site) {
    return (
      <main className="flex h-screen items-center justify-center p-6 text-ink-muted">
        {t('common.loading')}
      </main>
    );
  }

  const hasAreas = state.layout.areas.length > 0;
  const hasPlants = state.layout.plant_placements.length > 0;

  return (
    <main className="flex h-screen flex-col bg-surface">
      {/* Header */}
      <header className="flex items-center gap-3 bg-card px-4 py-3 shadow-sm">
        <NavLink
          to={`/sites/${siteId}`}
          className="text-sm text-primary underline"
        >
          {t('gardenLayout.back')}
        </NavLink>
        <div className="flex items-center gap-2">
          <span className="text-lg">{site.icon}</span>
          <h1 className="font-display text-lg font-semibold text-ink">
            {site.name}
          </h1>
        </div>
        <span className="flex-1" />
        {state.saving && (
          <span className="text-xs text-ink-muted">
            {t('gardenLayout.saving')}
          </span>
        )}
      </header>

      {/* Step guide banner (only in edit modes when layout is sparse) */}
      {state.mode !== 'view' && (
        <div className="flex items-center gap-3 bg-primary/5 px-4 py-2">
          <StepBadge n={1} active={state.mode === 'edit_areas'} done={hasAreas}>
            {t('gardenLayout.toolbar.areas')}
          </StepBadge>
          <span className="text-ink-muted">&rsaquo;</span>
          <StepBadge
            n={2}
            active={state.mode === 'place_plants'}
            done={hasPlants}
          >
            {t('gardenLayout.toolbar.plants')}
          </StepBadge>
          <span className="text-ink-muted">&rsaquo;</span>
          <StepBadge n={3} active={state.mode === 'place_markers'} done={false}>
            {t('gardenLayout.toolbar.markers')}
          </StepBadge>
        </div>
      )}

      {/* Canvas (fills available space) */}
      <div className="relative flex-1">
        <GardenCanvas
          layout={state.layout}
          plantSummaries={summaryMap}
          mode={state.mode}
          selectedId={state.selectedId}
          onAreaMove={state.moveArea}
          onAreaPointMove={state.updateAreaPoint}
          onPlantMove={state.movePlant}
          onPlantTap={handlePlantTap}
          onCanvasTap={handleCanvasTap}
          onMarkerMove={state.moveMarker}
          onMarkerRotate={state.rotateMarker}
          onSelect={state.select}
        />

        {/* Empty state overlay */}
        {layoutIsEmpty && state.mode === 'view' && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-4xl">{'\u{1F33F}'}</p>
            <p className="mt-2 text-sm font-medium text-ink">
              {t('gardenLayout.empty.title')}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              {t('gardenLayout.empty.subtitle')}
            </p>
            <button
              type="button"
              onClick={() => {
                state.setMode('edit_areas');
                setShowShapePicker(true);
              }}
              className="pointer-events-auto mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white active:scale-[0.98]"
            >
              {t('gardenLayout.empty.start')}
            </button>
          </div>
        )}

        {/* Empty canvas hint in edit mode with no areas */}
        {!hasAreas && state.mode === 'edit_areas' && !showShapePicker && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-sm text-ink-muted">
              {t('gardenLayout.empty.tapAddArea')}
            </p>
          </div>
        )}
      </div>

      {/* Pending plant indicator */}
      {state.pendingPlantId && (
        <div className="bg-primary/10 px-4 py-2 text-center text-xs font-medium text-primary">
          {t('gardenLayout.palette.tapCanvas')}
          <button
            type="button"
            onClick={() => state.setPendingPlantId(null)}
            className="ml-2 underline"
          >
            {t('common.cancel')}
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-card shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
        <LayoutToolbar
          mode={state.mode}
          selectedId={state.selectedId}
          saving={state.saving}
          hasPlants={summaries.length > 0}
          onSetMode={state.setMode}
          onAddArea={() => setShowShapePicker(true)}
          onDeleteSelected={handleDeleteSelected}
          onOpenPalette={() => setShowPalette(true)}
          onAddMarker={() => setShowMarkerPicker(true)}
        />
      </div>

      {/* Bottom sheets */}
      {showShapePicker && (
        <AreaShapePicker
          onPick={(template, label, widthCm, heightCm) => {
            state.addArea(template, label, widthCm, heightCm);
            setShowShapePicker(false);
          }}
          onClose={() => setShowShapePicker(false)}
        />
      )}

      {showPalette && (
        <PlantPalette
          unplacedPlants={unplacedPlants}
          pendingPlantId={state.pendingPlantId}
          onSelectPlant={(potId) => {
            state.setPendingPlantId(potId);
            setShowPalette(false);
          }}
          onClose={() => setShowPalette(false)}
        />
      )}

      {showMarkerPicker && (
        <MarkerPicker
          onPick={(type) => {
            handleAddMarker(type);
            setShowMarkerPicker(false);
          }}
          onClose={() => setShowMarkerPicker(false)}
        />
      )}
    </main>
  );
}

/** Small step badge for the guided workflow banner */
function StepBadge({
  n,
  active,
  done,
  children,
}: {
  n: number;
  active: boolean;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`flex items-center gap-1.5 text-xs font-medium ${
        active
          ? 'text-primary'
          : done
            ? 'text-success'
            : 'text-ink-muted'
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
          active
            ? 'bg-primary text-white'
            : done
              ? 'bg-success/20 text-success'
              : 'bg-black/5 text-ink-muted'
        }`}
      >
        {done ? '\u2713' : n}
      </span>
      {children}
    </span>
  );
}
