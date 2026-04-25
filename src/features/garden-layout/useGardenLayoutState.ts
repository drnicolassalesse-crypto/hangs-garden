import { useCallback, useEffect, useRef, useState } from 'react';
import { newId } from '../../data/ids';
import type {
  AreaShapeTemplate,
  GardenLayout,
  LayoutPoint,
  MarkerType,
  UUID,
} from '../../domain/types';
import {
  addArea,
  addMarker,
  addPlantToLayout,
  createDefaultArea,
  emptyLayout,
  moveArea,
  moveMarker,
  movePlantInLayout,
  removeArea,
  removeMarker,
  removePlantFromLayout,
  rotateMarker,
  updateAreaLabel,
  updateAreaPoint,
} from '../../domain/gardenLayout';
import { saveLayout } from './actions';

export type EditorMode =
  | 'view'
  | 'edit_areas'
  | 'place_plants'
  | 'place_markers';

export interface GardenLayoutState {
  layout: GardenLayout;
  mode: EditorMode;
  selectedId: UUID | null;
  pendingPlantId: UUID | null;
  isDirty: boolean;
  saving: boolean;
}

export function useGardenLayoutState(
  siteId: UUID,
  initialLayout: GardenLayout | null | undefined,
) {
  const [layout, setLayout] = useState<GardenLayout>(
    () => initialLayout ?? emptyLayout(),
  );
  const [mode, setMode] = useState<EditorMode>('view');
  const [selectedId, setSelectedId] = useState<UUID | null>(null);
  const [pendingPlantId, setPendingPlantId] = useState<UUID | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-initialize when the initial layout changes (e.g. after load)
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current && initialLayout) {
      setLayout(initialLayout);
      initialized.current = true;
    }
  }, [initialLayout]);

  // Debounced auto-save
  useEffect(() => {
    if (!isDirty) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      await saveLayout(siteId, layout);
      setSaving(false);
      setIsDirty(false);
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [isDirty, layout, siteId]);

  const update = useCallback((next: GardenLayout) => {
    setLayout(next);
    setIsDirty(true);
  }, []);

  // ── Area actions ──────────────────────────────────────
  const handleAddArea = useCallback(
    (
      template: AreaShapeTemplate,
      label: string,
      widthCm?: number,
      heightCm?: number,
    ) => {
      const area = createDefaultArea(template, newId, {
        label,
        widthCm,
        heightCm,
      });
      update(addArea(layout, area));
      setSelectedId(area.id);
    },
    [layout, update],
  );

  const handleRemoveArea = useCallback(
    (areaId: UUID) => {
      update(removeArea(layout, areaId));
      if (selectedId === areaId) setSelectedId(null);
    },
    [layout, update, selectedId],
  );

  const handleMoveArea = useCallback(
    (areaId: UUID, x: number, y: number) => {
      update(moveArea(layout, areaId, x, y));
    },
    [layout, update],
  );

  const handleUpdateAreaPoint = useCallback(
    (areaId: UUID, pointIndex: number, point: LayoutPoint) => {
      update(updateAreaPoint(layout, areaId, pointIndex, point));
    },
    [layout, update],
  );

  const handleUpdateAreaLabel = useCallback(
    (areaId: UUID, label: string) => {
      update(updateAreaLabel(layout, areaId, label));
    },
    [layout, update],
  );

  // ── Plant actions ──────────────────────────────────────
  const handlePlacePlant = useCallback(
    (potId: UUID, x: number, y: number) => {
      update(addPlantToLayout(layout, potId, x, y));
      setPendingPlantId(null);
    },
    [layout, update],
  );

  const handleMovePlant = useCallback(
    (potId: UUID, x: number, y: number) => {
      update(movePlantInLayout(layout, potId, x, y));
    },
    [layout, update],
  );

  const handleRemovePlant = useCallback(
    (potId: UUID) => {
      update(removePlantFromLayout(layout, potId));
      if (selectedId === potId) setSelectedId(null);
    },
    [layout, update, selectedId],
  );

  // ── Marker actions ─────────────────────────────────────
  const handleAddMarker = useCallback(
    (type: MarkerType, x: number, y: number) => {
      const next = addMarker(layout, type, x, y, newId);
      update(next);
      const added = next.markers[next.markers.length - 1];
      setSelectedId(added.id);
    },
    [layout, update],
  );

  const handleRemoveMarker = useCallback(
    (markerId: UUID) => {
      update(removeMarker(layout, markerId));
      if (selectedId === markerId) setSelectedId(null);
    },
    [layout, update, selectedId],
  );

  const handleMoveMarker = useCallback(
    (markerId: UUID, x: number, y: number) => {
      update(moveMarker(layout, markerId, x, y));
    },
    [layout, update],
  );

  const handleRotateMarker = useCallback(
    (markerId: UUID, rotation: number) => {
      update(rotateMarker(layout, markerId, rotation));
    },
    [layout, update],
  );

  // ── Selection / mode ───────────────────────────────────
  const handleSelect = useCallback((id: UUID | null) => {
    setSelectedId(id);
  }, []);

  const handleSetMode = useCallback((m: EditorMode) => {
    setMode(m);
    setSelectedId(null);
    setPendingPlantId(null);
  }, []);

  // Force save now (for unmount)
  const forceSave = useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (isDirty) {
      await saveLayout(siteId, layout);
      setIsDirty(false);
    }
  }, [isDirty, siteId, layout]);

  return {
    layout,
    mode,
    selectedId,
    pendingPlantId,
    isDirty,
    saving,
    setMode: handleSetMode,
    select: handleSelect,
    setPendingPlantId,
    // Areas
    addArea: handleAddArea,
    removeArea: handleRemoveArea,
    moveArea: handleMoveArea,
    updateAreaPoint: handleUpdateAreaPoint,
    updateAreaLabel: handleUpdateAreaLabel,
    // Plants
    placePlant: handlePlacePlant,
    movePlant: handleMovePlant,
    removePlant: handleRemovePlant,
    // Markers
    addMarker: handleAddMarker,
    removeMarker: handleRemoveMarker,
    moveMarker: handleMoveMarker,
    rotateMarker: handleRotateMarker,
    // Misc
    forceSave,
    setLayout: (l: GardenLayout) => {
      setLayout(l);
      setIsDirty(true);
    },
  };
}
