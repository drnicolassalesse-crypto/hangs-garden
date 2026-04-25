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
  selectedPointIndex: number | null; // which handle is active (-1 = none)
  isMeasuring: boolean;
  onDblTapArea: () => void;
  onDblTapHandle: (index: number) => void;
  onDblTapEdge: (afterIndex: number, gridPoint: LayoutPoint) => void;
  onDragPoint: (index: number, point: LayoutPoint) => void;
  onDragPointEnd: (index: number, point: LayoutPoint) => void;
}

const HANDLE_RADIUS = 14;
const ACTIVE_HANDLE_RADIUS = 18;

export function AreaShape({
  area,
  isSelected,
  selectedPointIndex,
  isMeasuring,
  onDblTapArea,
  onDblTapHandle,
  onDblTapEdge,
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

  // Double-tap on polygon body or edge
  const handleDblTap = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;

    if (isSelected && (isMeasuring || !isMeasuring)) {
      // If measuring or area already selected: check if tapping near an edge
      const stage = e.target.getStage();
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const group = e.target.getParent();
      if (!group) return;
      const transform = group.getAbsoluteTransform().copy().invert();
      const local = transform.point(pointer);

      // Find closest edge with a grid point
      const pts = area.points;
      let bestIdx = -1;
      let bestPoint: LayoutPoint | null = null;
      let bestDist = Infinity;

      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        const gp = findGridPointOnSegment(a, b, GRID_SIZE * 2);
        if (gp) {
          const d = (gp.x - local.x) ** 2 + (gp.y - local.y) ** 2;
          if (d < bestDist) {
            bestDist = d;
            bestIdx = i;
            bestPoint = gp;
          }
        }
      }

      if (bestPoint && bestIdx >= 0 && bestDist < (GRID_SIZE * 3) ** 2) {
        onDblTapEdge(bestIdx, bestPoint);
        return;
      }
    }

    // Otherwise: select/deselect area
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
        onDblClick={handleDblTap}
        onDblTap={handleDblTap}
      />

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

      {/* Midpoint indicators on edges (when selected, not in measure) */}
      {isSelected &&
        !isMeasuring &&
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

      {/* Edge length labels (when measuring and area selected) */}
      {isSelected &&
        isMeasuring &&
        area.points.map((pt, idx) => {
          const next = area.points[(idx + 1) % area.points.length];
          const mx = (pt.x + next.x) / 2;
          const my = (pt.y + next.y) / 2;
          const dx = next.x - pt.x;
          const dy = next.y - pt.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const cm = Math.round(len / 2); // PX_PER_CM = 2
          return (
            <Text
              key={`len-${idx}`}
              x={mx - 20}
              y={my - 14}
              width={40}
              text={`${cm}`}
              fontSize={10}
              fontFamily="Inter, system-ui, sans-serif"
              fill="#2D6A4F"
              fontStyle="bold"
              align="center"
              listening={false}
            />
          );
        })}
    </Group>
  );
}
