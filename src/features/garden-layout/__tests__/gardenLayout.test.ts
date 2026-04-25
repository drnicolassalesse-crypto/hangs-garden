import { beforeEach, describe, expect, it } from 'vitest';
import {
  addArea,
  addMarker,
  addPlantToLayout,
  cleanupDeletedPots,
  createDefaultArea,
  emptyLayout,
  flattenPoints,
  getPlantCareStatus,
  moveArea,
  moveMarker,
  movePlantInLayout,
  polygonCentroid,
  removeArea,
  removeMarker,
  removePlantFromLayout,
  rotateMarker,
  updateAreaLabel,
  updateAreaPoint,
} from '../../../domain/gardenLayout';
import type { PlantSummary } from '../../../domain/plantSummary';
import type { GardenLayout } from '../../../domain/types';

let idCounter = 0;
const fakeId = () => `id-${++idCounter}`;

function makeSummary(overrides: Partial<PlantSummary> = {}): PlantSummary {
  return {
    pot: {
      id: 'pot-1',
      species_id: 'sp-1',
      display_name: 'Test Plant',
      photo_blob_id: null,
      site_id: null,
      created_at: 0,
      notes: null,
      pot_size: 'm',
      pot_material: 'ceramic',
      soil_type: 'standard',
      light_level: 'medium',
      location_type: 'indoor',
      use_custom_schedule: false,
      custom_schedule: null,
    },
    species: null,
    site: null,
    nextDueTask: null,
    nextDueInDays: null,
    anyOverdue: false,
    ...overrides,
  };
}

describe('emptyLayout', () => {
  it('returns a layout with empty collections and default canvas size', () => {
    const layout = emptyLayout();
    expect(layout.areas).toEqual([]);
    expect(layout.plant_placements).toEqual([]);
    expect(layout.markers).toEqual([]);
    expect(layout.canvas_width).toBe(800);
    expect(layout.canvas_height).toBe(600);
    expect(layout.version).toBe(1);
  });
});

describe('createDefaultArea', () => {
  it('creates a rectangle with 4 points', () => {
    const area = createDefaultArea('rectangle', fakeId);
    expect(area.template).toBe('rectangle');
    expect(area.points).toHaveLength(4);
    expect(area.id).toBeTruthy();
  });

  it('creates an L-shape with 6 points', () => {
    const area = createDefaultArea('l_shape', fakeId);
    expect(area.template).toBe('l_shape');
    expect(area.points).toHaveLength(6);
  });

  it('creates a U-shape with 8 points', () => {
    const area = createDefaultArea('u_shape', fakeId);
    expect(area.template).toBe('u_shape');
    expect(area.points).toHaveLength(8);
  });
});

describe('area operations', () => {
  let base: GardenLayout;

  beforeEach(() => {
    idCounter = 0;
    base = emptyLayout();
  });

  it('addArea appends an area', () => {
    const area = createDefaultArea('rectangle', fakeId);
    const next = addArea(base, area);
    expect(next.areas).toHaveLength(1);
    expect(next.areas[0].id).toBe(area.id);
  });

  it('removeArea removes by id', () => {
    const a1 = createDefaultArea('rectangle', fakeId);
    const a2 = createDefaultArea('l_shape', fakeId);
    let layout = addArea(addArea(base, a1), a2);
    layout = removeArea(layout, a1.id);
    expect(layout.areas).toHaveLength(1);
    expect(layout.areas[0].id).toBe(a2.id);
  });

  it('moveArea updates position', () => {
    const area = createDefaultArea('rectangle', fakeId);
    let layout = addArea(base, area);
    layout = moveArea(layout, area.id, 100, 200);
    expect(layout.areas[0].x).toBe(100);
    expect(layout.areas[0].y).toBe(200);
  });

  it('updateAreaPoint modifies a specific vertex', () => {
    const area = createDefaultArea('rectangle', fakeId);
    let layout = addArea(base, area);
    layout = updateAreaPoint(layout, area.id, 1, { x: 300, y: 50 });
    expect(layout.areas[0].points[1]).toEqual({ x: 300, y: 50 });
    // Other points unchanged
    expect(layout.areas[0].points[0]).toEqual(area.points[0]);
  });

  it('updateAreaLabel sets the label', () => {
    const area = createDefaultArea('rectangle', fakeId);
    let layout = addArea(base, area);
    layout = updateAreaLabel(layout, area.id, 'Balcony');
    expect(layout.areas[0].label).toBe('Balcony');
  });
});

describe('plant placement operations', () => {
  let base: GardenLayout;

  beforeEach(() => {
    base = emptyLayout();
  });

  it('addPlantToLayout adds a placement', () => {
    const next = addPlantToLayout(base, 'pot-1', 50, 60);
    expect(next.plant_placements).toHaveLength(1);
    expect(next.plant_placements[0]).toEqual({ pot_id: 'pot-1', x: 50, y: 60 });
  });

  it('addPlantToLayout is idempotent for the same pot', () => {
    let layout = addPlantToLayout(base, 'pot-1', 50, 60);
    layout = addPlantToLayout(layout, 'pot-1', 100, 200);
    expect(layout.plant_placements).toHaveLength(1);
    expect(layout.plant_placements[0].x).toBe(50); // original position kept
  });

  it('removePlantFromLayout removes by pot id', () => {
    let layout = addPlantToLayout(base, 'pot-1', 50, 60);
    layout = addPlantToLayout(layout, 'pot-2', 100, 200);
    layout = removePlantFromLayout(layout, 'pot-1');
    expect(layout.plant_placements).toHaveLength(1);
    expect(layout.plant_placements[0].pot_id).toBe('pot-2');
  });

  it('movePlantInLayout updates position', () => {
    let layout = addPlantToLayout(base, 'pot-1', 50, 60);
    layout = movePlantInLayout(layout, 'pot-1', 200, 300);
    expect(layout.plant_placements[0]).toEqual({ pot_id: 'pot-1', x: 200, y: 300 });
  });
});

describe('marker operations', () => {
  let base: GardenLayout;

  beforeEach(() => {
    idCounter = 100;
    base = emptyLayout();
  });

  it('addMarker adds a marker with rotation 0', () => {
    const next = addMarker(base, 'water_source', 10, 20, fakeId);
    expect(next.markers).toHaveLength(1);
    expect(next.markers[0].type).toBe('water_source');
    expect(next.markers[0].rotation).toBe(0);
  });

  it('removeMarker removes by id', () => {
    let layout = addMarker(base, 'water_source', 10, 20, fakeId);
    const id = layout.markers[0].id;
    layout = removeMarker(layout, id);
    expect(layout.markers).toHaveLength(0);
  });

  it('moveMarker updates position', () => {
    let layout = addMarker(base, 'compass', 10, 20, fakeId);
    const id = layout.markers[0].id;
    layout = moveMarker(layout, id, 100, 200);
    expect(layout.markers[0].x).toBe(100);
    expect(layout.markers[0].y).toBe(200);
  });

  it('rotateMarker updates rotation', () => {
    let layout = addMarker(base, 'compass', 10, 20, fakeId);
    const id = layout.markers[0].id;
    layout = rotateMarker(layout, id, 45);
    expect(layout.markers[0].rotation).toBe(45);
  });
});

describe('getPlantCareStatus', () => {
  it('returns overdue when anyOverdue is true', () => {
    expect(getPlantCareStatus(makeSummary({ anyOverdue: true }))).toBe('overdue');
  });

  it('returns upcoming when next due is today', () => {
    expect(
      getPlantCareStatus(makeSummary({ anyOverdue: false, nextDueInDays: 0 })),
    ).toBe('upcoming');
  });

  it('returns upcoming when next due is within 3 days', () => {
    expect(
      getPlantCareStatus(makeSummary({ anyOverdue: false, nextDueInDays: 2 })),
    ).toBe('upcoming');
  });

  it('returns ok when next due is more than 3 days away', () => {
    expect(
      getPlantCareStatus(makeSummary({ anyOverdue: false, nextDueInDays: 7 })),
    ).toBe('ok');
  });

  it('returns ok when no tasks exist', () => {
    expect(
      getPlantCareStatus(makeSummary({ anyOverdue: false, nextDueInDays: null })),
    ).toBe('ok');
  });
});

describe('cleanupDeletedPots', () => {
  it('removes placements for pots not in the set', () => {
    let layout = emptyLayout();
    layout = addPlantToLayout(layout, 'pot-1', 10, 20);
    layout = addPlantToLayout(layout, 'pot-2', 30, 40);
    layout = addPlantToLayout(layout, 'pot-3', 50, 60);

    const existing = new Set(['pot-1', 'pot-3']);
    const cleaned = cleanupDeletedPots(layout, existing);
    expect(cleaned.plant_placements).toHaveLength(2);
    expect(cleaned.plant_placements.map((p) => p.pot_id)).toEqual(['pot-1', 'pot-3']);
  });

  it('returns same reference if nothing to clean', () => {
    let layout = emptyLayout();
    layout = addPlantToLayout(layout, 'pot-1', 10, 20);
    const existing = new Set(['pot-1']);
    const cleaned = cleanupDeletedPots(layout, existing);
    expect(cleaned).toBe(layout); // same reference
  });
});

describe('geometry helpers', () => {
  it('flattenPoints converts to [x1,y1,x2,y2,...] format', () => {
    const result = flattenPoints([
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
    ]);
    expect(result).toEqual([0, 0, 100, 0, 100, 50]);
  });

  it('polygonCentroid computes the average', () => {
    const c = polygonCentroid([
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 100 },
      { x: 0, y: 100 },
    ]);
    expect(c.x).toBe(100);
    expect(c.y).toBe(50);
  });
});
