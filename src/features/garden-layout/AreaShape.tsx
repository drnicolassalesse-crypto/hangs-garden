import { Group, Line, Circle, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { GardenArea, LayoutPoint } from '../../domain/types';
import {
  findGridPointOnSegment,
  flattenPoints,
  GRID_SIZE,
  polygonCentroid,
  snapToGrid,
} from '../../domain/gardenLayout';

interface AreaShapeProps {
  area: GardenArea;
  isSelected: boolean;
  selectedPointIndex: number | null;
  selectedEdgeIndex: number | null;
  onDblTapArea: () => void;
  onDblTapHandle: (index: number) => void;
  onDblTapEdge: (afterIndex: number, gridPoint: LayoutPoint) => void;
  onTapEdge: (edgeIndex: number) => void;
  onDragPoint: (index: number, point: LayoutPoint) => void;
  onDragPointEnd: (index: number, point: LayoutPoint) => void;
}

const HANDLE_RADIUS = 14;
const ACTIVE_HANDLE_RADIUS = 18;

export function AreaShape({
  area,
  isSelected,
  selectedPointIndex,
  selectedEdgeIndex,
  onDblTapArea,
  onDblTapHandle,
  onDblTapEdge,
  onTapEdge,
  onDragPoint,
  onDragPointEnd,
}: AreaShapeProps) {
  if (area.visible === false) return null;

  const flatPts = flattenPoints(area.points);
  const centroid = polygonCentroid(area.points);

  const dimLabel =
    area.width_cm && area.height_cm
      ? `${area.width_cm} \u00D7 ${area.height_cm} cm`
      : '';

  // Find which edge the pointer is closest to
  const findNearestEdge = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return null;
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    const group = e.target.getParent();
    if (!group) return null;
    const transform = group.getAbsoluteTransform().copy().invert();
    const local = transform.point(pointer);

    const pts = area.points;
    let bestIdx = -1;
    let bestDist = Infinity;
    let bestGridPoint: LayoutPoint | null = null;

    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      // Distance from local to the segment
      const dx = b.x - a.x, dy = b.y - a.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) continue;
      const t = Math.max(0, Math.min(1, ((local.x - a.x) * dx + (local.y - a.y) * dy) / lenSq));
      const px = a.x + t * dx, py = a.y + t * dy;
      const d = (local.x - px) ** 2 + (local.y - py) ** 2;
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
      // Also find grid point for insert
      const gp = findGridPointOnSegment(a, b, GRID_SIZE * 2);
      if (gp && i === bestIdx) bestGridPoint = gp;
    }
    // Recompute grid point for the best edge
    if (bestIdx >= 0 && !bestGridPoint) {
      const a = pts[bestIdx];
      const b = pts[(bestIdx + 1) % pts.length];
      bestGridPoint = findGridPointOnSegment(a, b, GRID_SIZE * 2);
    }
    return { edgeIndex: bestIdx, gridPoint: bestGridPoint };
  };

  // Single tap on polygon = select edge (show dimension)
  const handleTap = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;
    if (!isSelected) {
      // Not selected yet — don't handle single tap on edge, let dblTap handle area selection
      return;
    }
    const result = findNearestEdge(e);
    if (result && result.edgeIndex >= 0) {
      onTapEdge(result.edgeIndex);
    }
  };

  // Double-tap on polygon = insert point on edge OR select area
  const handleDblTap = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;

    if (isSelected) {
      // Insert point on nearest edge
      const result = findNearestEdge(e);
      if (result && result.edgeIndex >= 0 && result.gridPoint) {
        onDblTapEdge(result.edgeIndex, result.gridPoint);
        return;
      }
    }
    // Select/deselect area
    onDblTapArea();
  };

  return (
    <Group x={area.x} y={area.y}>
      {/* Filled polygon */}
      <Line
        points={flatPts}
        closed
        fill={area.fill_color + (isSelected ? '60' : '40')}
        stroke={area.fill_color}
        strokeWidth={isSelected ? 3 : 2}
        hitStrokeWidth={24}
        onClick={handleTap}
        onTap={handleTap}
        onDblClick={handleDblTap}
        onDblTap={handleDblTap}
      />

      {/* Highlighted selected edge */}
      {isSelected && selectedEdgeIndex !== null && (() => {
        const p1 = area.points[selectedEdgeIndex];
        const p2 = area.points[(selectedEdgeIndex + 1) % area.points.length];
        if (!p1 || !p2) return null;
        return (
          <Line
            points={[p1.x, p1.y, p2.x, p2.y]}
            stroke="#2D6A4F"
            strokeWidth={4}
            dash={[8, 4]}
            listening={false}
          />
        );
      })()}

      {/* Label */}
      {area.label ? (
        <>
          <Text
            x={centroid.x - 60}
            y={centroid.y - 16}
            width={120}
            text={area.label}
            fontSize={14}
            fontStyle="bold"
            fontFamily="Inter, system-ui, sans-serif"
            fill="#1B1B1B"
            align="center"
            listening={false}
          />
          {dimLabel && (
            <Text
              x={centroid.x - 60}
              y={centroid.y + 2}
              width={120}
              text={dimLabel}
              fontSize={10}
              fontFamily="Inter, system-ui, sans-serif"
              fill="#6B7280"
              align="center"
              listening={false}
            />
          )}
        </>
      ) : dimLabel ? (
        <Text
          x={centroid.x - 60}
          y={centroid.y - 6}
          width={120}
          text={dimLabel}
          fontSize={11}
          fontFamily="Inter, system-ui, sans-serif"
          fill="#6B7280"
          align="center"
          listening={false}
        />
      ) : null}

      {/* Corner handles (visible when area selected) */}
      {isSelected &&
        area.points.map((pt, idx) => {
          const isActive = selectedPointIndex === idx;
          return (
            <Circle
              key={`h-${idx}`}
              x={pt.x}
              y={pt.y}
              radius={isActive ? ACTIVE_HANDLE_RADIUS : HANDLE_RADIUS}
              fill={isActive ? area.fill_color : 'white'}
              stroke={isActive ? '#1B1B1B' : area.fill_color}
              strokeWidth={isActive ? 3 : 2}
              draggable={isActive}
              onDblClick={(e: KonvaEventObject<MouseEvent>) => {
                e.cancelBubble = true;
                onDblTapHandle(idx);
              }}
              onDblTap={(e: KonvaEventObject<TouchEvent>) => {
                e.cancelBubble = true;
                onDblTapHandle(idx);
              }}
              onDragMove={
                isActive
                  ? (e: KonvaEventObject<DragEvent>) => {
                      const snapped = {
                        x: snapToGrid(e.target.x()),
                        y: snapToGrid(e.target.y()),
                      };
                      e.target.x(snapped.x);
                      e.target.y(snapped.y);
                      onDragPoint(idx, snapped);
                    }
                  : undefined
              }
              onDragEnd={
                isActive
                  ? (e: KonvaEventObject<DragEvent>) => {
                      e.cancelBubble = true;
                      const snapped = {
                        x: snapToGrid(e.target.x()),
                        y: snapToGrid(e.target.y()),
                      };
                      onDragPointEnd(idx, snapped);
                    }
                  : undefined
              }
              onMouseDown={
                isActive
                  ? (e: KonvaEventObject<MouseEvent>) => {
                      e.cancelBubble = true;
                    }
                  : undefined
              }
              onTouchStart={
                isActive
                  ? (e: KonvaEventObject<TouchEvent>) => {
                      e.cancelBubble = true;
                    }
                  : undefined
              }
            />
          );
        })}

      {/* Midpoint indicators on edges (when selected) */}
      {isSelected &&
        area.points.map((pt, idx) => {
          const next = area.points[(idx + 1) % area.points.length];
          return (
            <Circle
              key={`mid-${idx}`}
              x={(pt.x + next.x) / 2}
              y={(pt.y + next.y) / 2}
              radius={4}
              fill={area.fill_color + '60'}
              stroke={area.fill_color}
              strokeWidth={1}
              listening={false}
            />
          );
        })}
    </Group>
  );
}
