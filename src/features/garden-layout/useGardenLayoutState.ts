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
  insertAreaPoint,
  moveMarker,
  movePlantInLayout,
  PX_PER_CM,
  removeArea,
  removeMarker,
  removePlantFromLayout,
  resizeAreaToDimensions,
  rotateMarker,
  setAreaVisibility,
  snapPoint,
  updateAreaLabel,
  updateAreaPoint,
} from '../../domain/gardenLayout';
import { saveLayout } from './actions';

// ── Interaction state machine ────────────────────────────

export type InteractionState =
  | { kind: 'idle' }
  | { kind: 'area_selected'; areaId: UUID }
  | {
      kind: 'point_selected';
      areaId: UUID;
      pointIndex: number;
      originalPoint: LayoutPoint;
    }
  | {
      kind: 'measure';
      activeEdge?: {
        areaId: UUID;
        edgeIndex: number;
        lengthCm: number;
      };
    };

// ── Hook ─────────────────────────────────────────────────

export function useGardenLayoutState(
  siteId: UUID,
  initialLayout: GardenLayout | null | undefined,
) {
  const [layout, setLayout] = useState<GardenLayout>(
    () => initialLayout ?? emptyLayout(),
  );
  const [interaction, setInteraction] = useState<InteractionState>({
    kind: 'idle',
  });
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [undoStack, setUndoStack] = useState<GardenLayout[]>([]);
  const [pendingPlantId, setPendingPlantId] = useState<UUID | null>(null);
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

  // ── Undo ──────────────────────────────────────────────

  const pushUndo = useCallback(() => {
    setUndoStack((prev) => [...prev, layout]);
  }, [layout]);

  const update = useCallback(
    (next: GardenLayout) => {
      pushUndo();
      setLayout(next);
      setIsDirty(true);
    },
    [pushUndo],
  );

  const undo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const restored = prev[prev.length - 1];
      setLayout(restored);
      setIsDirty(true);
      // If we were in point_selected, go back to area_selected
      setInteraction((cur) => {
        if (cur.kind === 'point_selected') {
          return { kind: 'area_selected', areaId: cur.areaId };
        }
        return cur;
      });
      return prev.slice(0, -1);
    });
  }, []);

  const canUndo = undoStack.length > 0;

  // ── Interaction state transitions ─────────────────────

  const deselect = useCallback(() => {
    setInteraction((cur) => {
      if (cur.kind === 'measure') return { kind: 'measure' }; // stay in measure but clear edge
      return { kind: 'idle' };
    });
  }, []);

  const selectArea = useCallback((areaId: UUID) => {
    setInteraction((cur) => {
      if (cur.kind === 'measure') {
        return { kind: 'measure' }; // in measure mode, selecting area shows edges
      }
      return { kind: 'area_selected', areaId };
    });
  }, []);

  const selectPoint = useCallback(
    (areaId: UUID, pointIndex: number) => {
      const area = layout.areas.find((a) => a.id === areaId);
      if (!area) return;
      const originalPoint = { ...area.points[pointIndex] };
      setInteraction({
        kind: 'point_selected',
        areaId,
        pointIndex,
        originalPoint,
      });
    },
    [layout],
  );

  const fixPoint = useCallback(() => {
    setInteraction((cur) => {
      if (cur.kind === 'point_selected') {
        return { kind: 'area_selected', areaId: cur.areaId };
      }
      return cur;
    });
  }, []);

  const toggleMeasure = useCallback(() => {
    setInteraction((cur) => {
      if (cur.kind === 'measure') return { kind: 'idle' };
      return { kind: 'measure' };
    });
  }, []);

  const setMeasureEdge = useCallback(
    (areaId: UUID, edgeIndex: number) => {
      const area = layout.areas.find((a) => a.id === areaId);
      if (!area) return;
      const p1 = area.points[edgeIndex];
      const p2 = area.points[(edgeIndex + 1) % area.points.length];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const lengthPx = Math.sqrt(dx * dx + dy * dy);
      const lengthCm = Math.round((lengthPx / PX_PER_CM) * 10) / 10;
      setInteraction({ kind: 'measure', activeEdge: { areaId, edgeIndex, lengthCm } });
    },
    [layout],
  );

  const applyEdgeLength = useCallback(
    (newLengthCm: number) => {
      if (interaction.kind !== 'measure' || !interaction.activeEdge) return;
      const { areaId, edgeIndex } = interaction.activeEdge;
      const area = layout.areas.find((a) => a.id === areaId);
      if (!area) return;

      const p1 = area.points[edgeIndex];
      const p2Idx = (edgeIndex + 1) % area.points.length;
      const p2 = area.points[p2Idx];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const curLen = Math.sqrt(dx * dx + dy * dy);
      if (curLen === 0) return;

      const targetLen = newLengthCm * PX_PER_CM;
      const scale = targetLen / curLen;
      const newP2 = snapPoint({
        x: p1.x + dx * scale,
        y: p1.y + dy * scale,
      });

      update(updateAreaPoint(layout, areaId, p2Idx, newP2));
      // Update the displayed measurement
      setInteraction({
        kind: 'measure',
        activeEdge: { areaId, edgeIndex, lengthCm: newLengthCm },
      });
    },
    [interaction, layout, update],
  );

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
      setInteraction({ kind: 'area_selected', areaId: area.id });
    },
    [layout, update],
  );

  const handleRemoveArea = useCallback(
    (areaId: UUID) => {
      update(removeArea(layout, areaId));
      deselect();
    },
    [layout, update, deselect],
  );

  const handleMoveAreaPoint = useCallback(
    (areaId: UUID, pointIndex: number, point: LayoutPoint) => {
      // Don't push undo on every drag move — only on first move (handled by caller)
      setLayout(updateAreaPoint(layout, areaId, pointIndex, snapPoint(point)));
      setIsDirty(true);
    },
    [layout],
  );

  const handleCommitPointMove = useCallback(() => {
    // Push undo snapshot for the point move (before move started)
    // The originalPoint is saved in interaction state
    fixPoint();
  }, [fixPoint]);

  const handleInsertAreaPoint = useCallback(
    (areaId: UUID, afterIndex: number, point: LayoutPoint) => {
      update(insertAreaPoint(layout, areaId, afterIndex, snapPoint(point)));
    },
    [layout, update],
  );

  const handleUpdateAreaLabel = useCallback(
    (areaId: UUID, label: string) => {
      update(updateAreaLabel(layout, areaId, label));
    },
    [layout, update],
  );

  const handleResizeArea = useCallback(
    (areaId: UUID, widthCm: number, heightCm: number) => {
      update(resizeAreaToDimensions(layout, areaId, widthCm, heightCm));
    },
    [layout, update],
  );

  const handleSetAreaVisibility = useCallback(
    (areaId: UUID, visible: boolean) => {
      update(setAreaVisibility(layout, areaId, visible));
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
    },
    [layout, update],
  );

  // ── Marker actions ─────────────────────────────────────

  const handleAddMarker = useCallback(
    (type: MarkerType, x: number, y: number) => {
      update(addMarker(layout, type, x, y, newId));
    },
    [layout, update],
  );

  const handleRemoveMarker = useCallback(
    (markerId: UUID) => {
      update(removeMarker(layout, markerId));
    },
    [layout, update],
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

  return {
    layout,
    interaction,
    pendingPlantId,
    isDirty,
    saving,
    canUndo,
    // Undo
    undo,
    pushUndo,
    // Interaction
    deselect,
    selectArea,
    selectPoint,
    fixPoint,
    toggleMeasure,
    setMeasureEdge,
    applyEdgeLength,
    setPendingPlantId,
    // Areas
    addArea: handleAddArea,
    removeArea: handleRemoveArea,
    moveAreaPoint: handleMoveAreaPoint,
    commitPointMove: handleCommitPointMove,
    insertAreaPoint: handleInsertAreaPoint,
    updateAreaLabel: handleUpdateAreaLabel,
    resizeArea: handleResizeArea,
    setAreaVisibility: handleSetAreaVisibility,
    // Plants
    placePlant: handlePlacePlant,
    movePlant: handleMovePlant,
    removePlant: handleRemovePlant,
    // Markers
    addMarker: handleAddMarker,
    removeMarker: handleRemoveMarker,
    moveMarker: handleMoveMarker,
    rotateMarker: handleRotateMarker,
  };
}
