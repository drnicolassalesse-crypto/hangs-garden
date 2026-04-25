import type {
  AreaShapeTemplate,
  GardenArea,
  GardenLayout,
  LayoutMarker,
  LayoutPoint,
  MarkerType,
  UUID,
} from './types';
import type { PlantSummary } from './plantSummary';

// ── Factory helpers ────────────────────────────────────────

export function emptyLayout(): GardenLayout {
  return {
    areas: [],
    plant_placements: [],
    markers: [],
    canvas_width: 800,
    canvas_height: 600,
    version: 1,
  };
}

const TEMPLATE_POINTS: Record<AreaShapeTemplate, LayoutPoint[]> = {
  rectangle: [
    { x: 0, y: 0 },
    { x: 200, y: 0 },
    { x: 200, y: 150 },
    { x: 0, y: 150 },
  ],
  l_shape: [
    { x: 0, y: 0 },
    { x: 200, y: 0 },
    { x: 200, y: 80 },
    { x: 100, y: 80 },
    { x: 100, y: 150 },
    { x: 0, y: 150 },
  ],
  u_shape: [
    { x: 0, y: 0 },
    { x: 60, y: 0 },
    { x: 60, y: 80 },
    { x: 140, y: 80 },
    { x: 140, y: 0 },
    { x: 200, y: 0 },
    { x: 200, y: 150 },
    { x: 0, y: 150 },
  ],
};

const AREA_COLORS = ['#52B788', '#74C69D', '#40916C', '#2D6A4F', '#95D5B2'];

let colorIndex = 0;

export function createDefaultArea(
  template: AreaShapeTemplate,
  newId: () => UUID,
): GardenArea {
  const color = AREA_COLORS[colorIndex % AREA_COLORS.length];
  colorIndex++;
  return {
    id: newId(),
    template,
    points: TEMPLATE_POINTS[template].map((p) => ({ ...p })),
    label: '',
    fill_color: color,
    x: 50,
    y: 50,
  };
}

// ── Area operations ────────────────────────────────────────

export function addArea(
  layout: GardenLayout,
  area: GardenArea,
): GardenLayout {
  return { ...layout, areas: [...layout.areas, area] };
}

export function removeArea(
  layout: GardenLayout,
  areaId: UUID,
): GardenLayout {
  return { ...layout, areas: layout.areas.filter((a) => a.id !== areaId) };
}

export function moveArea(
  layout: GardenLayout,
  areaId: UUID,
  x: number,
  y: number,
): GardenLayout {
  return {
    ...layout,
    areas: layout.areas.map((a) => (a.id === areaId ? { ...a, x, y } : a)),
  };
}

export function updateAreaPoint(
  layout: GardenLayout,
  areaId: UUID,
  pointIndex: number,
  point: LayoutPoint,
): GardenLayout {
  return {
    ...layout,
    areas: layout.areas.map((a) => {
      if (a.id !== areaId) return a;
      const points = [...a.points];
      points[pointIndex] = point;
      return { ...a, points };
    }),
  };
}

export function updateAreaLabel(
  layout: GardenLayout,
  areaId: UUID,
  label: string,
): GardenLayout {
  return {
    ...layout,
    areas: layout.areas.map((a) =>
      a.id === areaId ? { ...a, label } : a,
    ),
  };
}

// ── Plant placement operations ────────────────────────────

export function addPlantToLayout(
  layout: GardenLayout,
  potId: UUID,
  x: number,
  y: number,
): GardenLayout {
  if (layout.plant_placements.some((p) => p.pot_id === potId)) return layout;
  return {
    ...layout,
    plant_placements: [...layout.plant_placements, { pot_id: potId, x, y }],
  };
}

export function removePlantFromLayout(
  layout: GardenLayout,
  potId: UUID,
): GardenLayout {
  return {
    ...layout,
    plant_placements: layout.plant_placements.filter(
      (p) => p.pot_id !== potId,
    ),
  };
}

export function movePlantInLayout(
  layout: GardenLayout,
  potId: UUID,
  x: number,
  y: number,
): GardenLayout {
  return {
    ...layout,
    plant_placements: layout.plant_placements.map((p) =>
      p.pot_id === potId ? { ...p, x, y } : p,
    ),
  };
}

// ── Marker operations ─────────────────────────────────────

export function addMarker(
  layout: GardenLayout,
  type: MarkerType,
  x: number,
  y: number,
  newId: () => UUID,
): GardenLayout {
  const marker: LayoutMarker = { id: newId(), type, x, y, rotation: 0 };
  return { ...layout, markers: [...layout.markers, marker] };
}

export function removeMarker(
  layout: GardenLayout,
  markerId: UUID,
): GardenLayout {
  return {
    ...layout,
    markers: layout.markers.filter((m) => m.id !== markerId),
  };
}

export function moveMarker(
  layout: GardenLayout,
  markerId: UUID,
  x: number,
  y: number,
): GardenLayout {
  return {
    ...layout,
    markers: layout.markers.map((m) =>
      m.id === markerId ? { ...m, x, y } : m,
    ),
  };
}

export function rotateMarker(
  layout: GardenLayout,
  markerId: UUID,
  rotation: number,
): GardenLayout {
  return {
    ...layout,
    markers: layout.markers.map((m) =>
      m.id === markerId ? { ...m, rotation } : m,
    ),
  };
}

// ── Care status derivation ────────────────────────────────

export type PlantCareStatus = 'ok' | 'upcoming' | 'overdue';

export function getPlantCareStatus(summary: PlantSummary): PlantCareStatus {
  if (summary.anyOverdue) return 'overdue';
  if (
    summary.nextDueInDays !== null &&
    summary.nextDueInDays >= 0 &&
    summary.nextDueInDays <= 3
  )
    return 'upcoming';
  return 'ok';
}

export const CARE_STATUS_COLORS: Record<PlantCareStatus, string> = {
  ok: '#40916C',
  upcoming: '#F4A261',
  overdue: '#E63946',
};

// ── Cleanup ───────────────────────────────────────────────

export function cleanupDeletedPots(
  layout: GardenLayout,
  existingPotIds: Set<UUID>,
): GardenLayout {
  const filtered = layout.plant_placements.filter((p) =>
    existingPotIds.has(p.pot_id),
  );
  if (filtered.length === layout.plant_placements.length) return layout;
  return { ...layout, plant_placements: filtered };
}

// ── Geometry helpers (for rendering) ──────────────────────

/** Flatten LayoutPoint[] to the [x1,y1,x2,y2,...] format Konva Line expects. */
export function flattenPoints(points: LayoutPoint[]): number[] {
  const flat: number[] = [];
  for (const p of points) {
    flat.push(p.x, p.y);
  }
  return flat;
}

/** Compute centroid of a polygon for label placement. */
export function polygonCentroid(points: LayoutPoint[]): LayoutPoint {
  let cx = 0;
  let cy = 0;
  for (const p of points) {
    cx += p.x;
    cy += p.y;
  }
  return { x: cx / points.length, y: cy / points.length };
}
