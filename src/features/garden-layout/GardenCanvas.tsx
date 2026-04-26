import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Stage, Layer, Line } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { GardenLayout, LayoutPoint, UUID } from '../../domain/types';
import type { PlantSummary } from '../../domain/plantSummary';
import type { InteractionState } from './useGardenLayoutState';
import { AreaShape } from './AreaShape';
import { PlantIcon } from './PlantIcon';
import { MarkerIcon } from './MarkerIcon';

export interface GardenCanvasHandle {
  centerView: () => void;
}

interface GardenCanvasProps {
  layout: GardenLayout;
  plantSummaries: Map<UUID, PlantSummary>;
  interaction: InteractionState;
  // Area interactions
  onDblTapArea: (areaId: UUID) => void;
  onDblTapHandle: (areaId: UUID, pointIndex: number) => void;
  onDblTapEdge: (areaId: UUID, afterIndex: number, point: LayoutPoint) => void;
  onTapEdge: (areaId: UUID, edgeIndex: number) => void;
  onDragPoint: (areaId: UUID, pointIndex: number, point: LayoutPoint) => void;
  onDragPointEnd: (areaId: UUID, pointIndex: number, point: LayoutPoint) => void;
  // Plant/marker
  onPlantTap: (potId: UUID) => void;
  onCanvasTap: (x: number, y: number) => void;
  onDblTapEmpty: () => void;
}

const GRID_SIZE = 20;
const MIN_SCALE = 0.3;
const MAX_SCALE = 3;

function getDistance(p1: Touch, p2: Touch) {
  return Math.sqrt(
    (p2.clientX - p1.clientX) ** 2 + (p2.clientY - p1.clientY) ** 2,
  );
}

function getMidpoint(p1: Touch, p2: Touch) {
  return {
    x: (p1.clientX + p2.clientX) / 2,
    y: (p1.clientY + p2.clientY) / 2,
  };
}

export const GardenCanvas = forwardRef<GardenCanvasHandle, GardenCanvasProps>(
  function GardenCanvas(
    {
      layout,
      plantSummaries,
      interaction,
      onDblTapArea,
      onDblTapHandle,
      onDblTapEdge,
      onTapEdge,
      onDragPoint,
      onDragPointEnd,
      onPlantTap,
      onCanvasTap,
      onDblTapEmpty,
    },
    ref,
  ) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [size, setSize] = useState({ width: 400, height: 400 });
  const lastDist = useRef(0);

  // Responsive sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Pinch-to-zoom
  const handleTouchMove = useCallback((e: KonvaEventObject<TouchEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;
    const touches = e.evt.touches;
    if (touches.length !== 2) return;
    e.evt.preventDefault();

    const dist = getDistance(touches[0], touches[1]);
    const center = getMidpoint(touches[0], touches[1]);

    if (lastDist.current === 0) {
      lastDist.current = dist;
      return;
    }

    const scale = stage.scaleX() * (dist / lastDist.current);
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
    const stagePos = stage.position();
    const pc = {
      x: (center.x - stagePos.x) / stage.scaleX(),
      y: (center.y - stagePos.y) / stage.scaleY(),
    };
    stage.scaleX(clamped);
    stage.scaleY(clamped);
    stage.position({
      x: center.x - pc.x * clamped,
      y: center.y - pc.y * clamped,
    });
    stage.batchDraw();
    lastDist.current = dist;
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastDist.current = 0;
  }, []);

  // Single tap on empty canvas (for placing pending plants)
  const handleStageTap = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (e.target !== stageRef.current) return;
      const stage = stageRef.current;
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;
      const scale = stage.scaleX();
      const sp = stage.position();
      onCanvasTap((pos.x - sp.x) / scale, (pos.y - sp.y) / scale);
    },
    [onCanvasTap],
  );

  // Double-tap on empty canvas → deselect
  const handleStageDblTap = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (e.target !== stageRef.current) return;
      onDblTapEmpty();
    },
    [onDblTapEmpty],
  );

  // Mouse wheel zoom
  const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const scaleBy = 1.05;
    const newScale =
      e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
    const mp = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    stage.scale({ x: clamped, y: clamped });
    stage.position({
      x: pointer.x - mp.x * clamped,
      y: pointer.y - mp.y * clamped,
    });
    stage.batchDraw();
  }, []);

  // Center view: fit all areas into the viewport with padding
  const centerView = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (layout.areas.length === 0) {
      stage.scale({ x: 1, y: 1 });
      stage.position({ x: 0, y: 0 });
      stage.batchDraw();
      return;
    }
    // Compute bounding box of all visible areas
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const area of layout.areas) {
      if (area.visible === false) continue;
      for (const pt of area.points) {
        const ax = area.x + pt.x;
        const ay = area.y + pt.y;
        if (ax < minX) minX = ax;
        if (ay < minY) minY = ay;
        if (ax > maxX) maxX = ax;
        if (ay > maxY) maxY = ay;
      }
    }
    if (!isFinite(minX)) return;
    const padding = 40;
    const bboxW = maxX - minX + padding * 2;
    const bboxH = maxY - minY + padding * 2;
    const scaleX = size.width / bboxW;
    const scaleY = size.height / bboxH;
    const scale = Math.min(scaleX, scaleY, MAX_SCALE);
    const clamped = Math.max(MIN_SCALE, scale);
    stage.scale({ x: clamped, y: clamped });
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    stage.position({
      x: size.width / 2 - cx * clamped,
      y: size.height / 2 - cy * clamped,
    });
    stage.batchDraw();
  }, [layout.areas, size]);

  useImperativeHandle(ref, () => ({ centerView }), [centerView]);

  // Auto-center on first render when areas exist
  const didCenter = useRef(false);
  useEffect(() => {
    if (!didCenter.current && layout.areas.length > 0 && size.width > 100) {
      didCenter.current = true;
      centerView();
    }
  }, [layout.areas.length, size, centerView]);

  // Grid: extend to cover a large area so it always fills the viewport
  const GRID_EXTENT = 2000;
  const gridLines: { points: number[]; key: string }[] = [];
  for (let x = -GRID_EXTENT; x <= GRID_EXTENT; x += GRID_SIZE) {
    gridLines.push({ points: [x, -GRID_EXTENT, x, GRID_EXTENT], key: `gv-${x}` });
  }
  for (let y = -GRID_EXTENT; y <= GRID_EXTENT; y += GRID_SIZE) {
    gridLines.push({ points: [-GRID_EXTENT, y, GRID_EXTENT, y], key: `gh-${y}` });
  }

  // Derive per-area state from interaction
  const selectedAreaId =
    interaction.kind === 'area_selected'
      ? interaction.areaId
      : interaction.kind === 'point_selected'
        ? interaction.areaId
        : null;

  const selectedPointIndex =
    interaction.kind === 'point_selected' ? interaction.pointIndex : null;

  const selectedEdge =
    (interaction.kind === 'idle' || interaction.kind === 'area_selected') &&
    interaction.selectedEdge
      ? interaction.selectedEdge
      : null;

  return (
    <div ref={containerRef} className="flex-1 overflow-hidden bg-surface">
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        draggable={true}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleStageTap}
        onTap={handleStageTap}
        onDblClick={handleStageDblTap}
        onDblTap={handleStageDblTap}
        onWheel={handleWheel}
      >
        <Layer>
          {/* Grid */}
          {gridLines.map((l) => (
            <Line
              key={l.key}
              points={l.points}
              stroke="#e0e0e0"
              strokeWidth={0.5}
              listening={false}
            />
          ))}

          {/* Areas */}
          {layout.areas.map((area) => (
            <AreaShape
              key={area.id}
              area={area}
              isSelected={selectedAreaId === area.id}
              selectedPointIndex={
                selectedAreaId === area.id ? selectedPointIndex : null
              }
              selectedEdgeIndex={
                selectedEdge && selectedEdge.areaId === area.id
                  ? selectedEdge.edgeIndex
                  : null
              }
              onDblTapArea={() => onDblTapArea(area.id)}
              onDblTapHandle={(idx) => onDblTapHandle(area.id, idx)}
              onDblTapEdge={(afterIdx, pt) => onDblTapEdge(area.id, afterIdx, pt)}
              onTapEdge={(idx) => onTapEdge(area.id, idx)}
              onDragPoint={(idx, pt) => onDragPoint(area.id, idx, pt)}
              onDragPointEnd={(idx, pt) => onDragPointEnd(area.id, idx, pt)}
            />
          ))}

          {/* Markers */}
          {layout.markers.map((marker) => (
            <MarkerIcon
              key={marker.id}
              marker={marker}
              isSelected={false}
              isEditable={false}
              onDragEnd={() => {}}
              onRotate={() => {}}
              onSelect={() => {}}
            />
          ))}

          {/* Plants */}
          {layout.plant_placements.map((pl) => {
            const summary = plantSummaries.get(pl.pot_id);
            if (!summary) return null;
            return (
              <PlantIcon
                key={pl.pot_id}
                placement={pl}
                summary={summary}
                isSelected={false}
                isEditable={false}
                onDragEnd={() => {}}
                onTap={() => onPlantTap(pl.pot_id)}
              />
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
},
);
