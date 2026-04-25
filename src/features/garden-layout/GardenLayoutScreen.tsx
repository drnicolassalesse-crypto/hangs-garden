import { useCallback, useEffect, useMemo, useState } from 'react';
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
        // Keep palette open for placing more plants
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

      {/* Canvas (fills available space) */}
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
          onPick={(template, label) => {
            state.addArea(template, label);
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
