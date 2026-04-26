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
import { MeasurePanel } from './MeasurePanel';
import { AreaShapePicker } from './AreaShapePicker';
import { PlantPalette } from './PlantPalette';
import { MarkerPicker } from './MarkerPicker';
import { ObjectListPanel } from './ObjectListPanel';
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

    // Ensure layout exists
    if (!mine.layout) {
      const empty = emptyLayout();
      await saveLayout(mine.id, empty);
      mine.layout = empty;
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

    // Lazy cleanup
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

  // Initialize state AFTER site loaded (no race condition)
  const initialLayout = site?.layout ?? null;
  const state = useGardenLayoutState(siteId as UUID, initialLayout);

  // Bottom sheets
  const [showShapePicker, setShowShapePicker] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showMarkerPicker, setShowMarkerPicker] = useState(false);
  const [showObjectList, setShowObjectList] = useState(false);

  // Auto-open shape picker for empty layouts
  const layoutIsEmpty =
    state.layout.areas.length === 0 &&
    state.layout.plant_placements.length === 0;

  useEffect(() => {
    if (!loading && layoutIsEmpty && !didAutoOpen.current) {
      didAutoOpen.current = true;
      setTimeout(() => setShowShapePicker(true), 300);
    }
  }, [loading, layoutIsEmpty]);

  // Summaries map for canvas
  const summaryMap = useMemo(
    () => new Map(summaries.map((s) => [s.pot.id, s])),
    [summaries],
  );

  // Unplaced plants
  const placedPotIds = useMemo(
    () => new Set(state.layout.plant_placements.map((p) => p.pot_id)),
    [state.layout.plant_placements],
  );
  const unplacedPlants = useMemo(
    () => summaries.filter((s) => !placedPotIds.has(s.pot.id)),
    [summaries, placedPotIds],
  );

  // ── Interaction handlers ─────────────────────────────

  const handleDblTapArea = useCallback(
    (areaId: UUID) => {
      if (
        state.interaction.kind === 'point_selected' &&
        state.interaction.areaId === areaId
      ) {
        // Fix the point
        state.fixPoint();
        return;
      }
      state.selectArea(areaId);
    },
    [state],
  );

  const handleDblTapHandle = useCallback(
    (areaId: UUID, pointIndex: number) => {
      if (state.interaction.kind === 'point_selected') {
        // Already have a point selected — fix it first, then select new
        state.fixPoint();
      }
      // Push undo before entering point-select (so undo restores original)
      state.pushUndo();
      state.selectPoint(areaId, pointIndex);
    },
    [state],
  );

  const handleDblTapEdge = useCallback(
    (areaId: UUID, afterIndex: number, point: { x: number; y: number }) => {
      // Double-tap on edge = insert new point
      state.insertAreaPoint(areaId, afterIndex, point);
    },
    [state],
  );

  const handleTapEdge = useCallback(
    (areaId: UUID, edgeIndex: number) => {
      // Single tap on edge = select it, show dimension
      state.selectEdge(areaId, edgeIndex);
    },
    [state],
  );

  const handleDragPoint = useCallback(
    (areaId: UUID, pointIndex: number, point: { x: number; y: number }) => {
      state.moveAreaPoint(areaId, pointIndex, point);
    },
    [state],
  );

  const handleDragPointEnd = useCallback(
    (areaId: UUID, pointIndex: number, point: { x: number; y: number }) => {
      state.moveAreaPoint(areaId, pointIndex, point);
    },
    [state],
  );

  const handleCanvasTap = useCallback(
    (x: number, y: number) => {
      if (state.pendingPlantId) {
        state.placePlant(state.pendingPlantId, x, y);
      }
    },
    [state],
  );

  const handlePlantTap = useCallback(
    (potId: UUID) => {
      navigate(`/plants/${potId}`);
    },
    [navigate],
  );

  const handleDblTapEmpty = useCallback(() => {
    state.deselect();
  }, [state]);

  const handleDeleteSelected = useCallback(() => {
    if (state.interaction.kind === 'area_selected') {
      state.removeArea(state.interaction.areaId);
    } else if (state.interaction.kind === 'point_selected') {
      state.removeArea(state.interaction.areaId);
    }
  }, [state]);

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

  // Selected edge (from any state that has selectedEdge)
  const selectedEdge =
    (state.interaction.kind === 'idle' ||
      state.interaction.kind === 'area_selected') &&
    state.interaction.selectedEdge
      ? state.interaction.selectedEdge
      : null;

  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden bg-surface">
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

      {/* Interaction hint */}
      <div className="bg-primary/5 px-4 py-1.5 text-center text-[11px] text-ink-muted">
        {state.interaction.kind === 'idle' && t('gardenLayout.hint.idle')}
        {state.interaction.kind === 'area_selected' &&
          t('gardenLayout.hint.areaSelected')}
        {state.interaction.kind === 'point_selected' &&
          t('gardenLayout.hint.pointSelected')}
        {state.interaction.kind === 'idle' &&
          state.interaction.selectedEdge &&
          t('gardenLayout.hint.edgeSelected')}
      </div>

      {/* Canvas (flex-1 + min-h-0 ensures it shrinks to fit between header and toolbar) */}
      <div className="relative min-h-0 flex-1">
        <GardenCanvas
          layout={state.layout}
          plantSummaries={summaryMap}
          interaction={state.interaction}
          onDblTapArea={handleDblTapArea}
          onDblTapHandle={handleDblTapHandle}
          onDblTapEdge={handleDblTapEdge}
          onTapEdge={handleTapEdge}
          onDragPoint={handleDragPoint}
          onDragPointEnd={handleDragPointEnd}
          onPlantTap={handlePlantTap}
          onCanvasTap={handleCanvasTap}
          onDblTapEmpty={handleDblTapEmpty}
        />

        {/* Empty state */}
        {layoutIsEmpty && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-4xl">{'\u{1F33F}'}</p>
            <p className="mt-2 text-sm font-medium text-ink">
              {t('gardenLayout.empty.title')}
            </p>
            <button
              type="button"
              onClick={() => setShowShapePicker(true)}
              className="pointer-events-auto mt-3 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white active:scale-[0.98]"
            >
              {t('gardenLayout.empty.start')}
            </button>
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

      {/* Dimension field (always visible) */}
      <MeasurePanel
        edgeIndex={selectedEdge ? selectedEdge.edgeIndex : null}
        lengthCm={selectedEdge ? selectedEdge.lengthCm : null}
        onApply={state.applyEdgeLength}
      />

      {/* Toolbar */}
      <div className="bg-card shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
        <LayoutToolbar
          interaction={state.interaction}
          canUndo={state.canUndo}
          saving={state.saving}
          onUndo={state.undo}
          onAddArea={() => setShowShapePicker(true)}
          onOpenPalette={() => setShowPalette(true)}
          onAddMarker={() => setShowMarkerPicker(true)}
          onOpenObjectList={() => setShowObjectList(true)}
          onDeleteSelected={handleDeleteSelected}
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

      {showObjectList && (
        <ObjectListPanel
          areas={state.layout.areas}
          selectedId={
            state.interaction.kind === 'area_selected'
              ? state.interaction.areaId
              : state.interaction.kind === 'point_selected'
                ? state.interaction.areaId
                : null
          }
          onSelect={(id) => {
            state.selectArea(id);
            setShowObjectList(false);
          }}
          onToggleVisibility={state.setAreaVisibility}
          onUpdateLabel={state.updateAreaLabel}
          onResizeArea={state.resizeArea}
          onClose={() => setShowObjectList(false)}
        />
      )}
    </main>
  );
}
