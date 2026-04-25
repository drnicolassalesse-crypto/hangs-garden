import { useRef } from 'react';
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
  isEditable: boolean;
  onDragEnd: (x: number, y: number) => void;
  onPointDragEnd: (index: number, point: LayoutPoint) => void;
  onInsertPoint: (afterIndex: number, point: LayoutPoint) => void;
  onSelect: () => void;
}

const HANDLE_RADIUS = 12;

export function AreaShape({
  area,
  isSelected,
  isEditable,
  onDragEnd,
  onPointDragEnd,
  onInsertPoint,
  onSelect,
}: AreaShapeProps) {
  const flatPts = flattenPoints(area.points);
  const centroid = polygonCentroid(area.points);
  const draggingHandle = useRef(false);

  const dimLabel =
    area.width_cm && area.height_cm
      ? `${area.width_cm} \u00D7 ${area.height_cm} cm`
      : '';

  // Handle clicking on the polygon line to insert a point
  const handleLineClick = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isSelected || !isEditable) return;
    e.cancelBubble = true;

    // Get click position relative to the group
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Convert to group-local coords
    const group = e.target.getParent();
    if (!group) return;
    const transform = group.getAbsoluteTransform().copy().invert();
    const localPos = transform.point(pointer);

    // Find which segment is closest and the nearest grid point on it
    const pts = area.points;
    let bestSegIdx = -1;
    let bestPoint: LayoutPoint | null = null;
    let bestDist = Infinity;

    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const gp = findGridPointOnSegment(a, b, GRID_SIZE * 1.5);
      if (gp) {
        const d = (gp.x - localPos.x) ** 2 + (gp.y - localPos.y) ** 2;
        if (d < bestDist) {
          bestDist = d;
          bestSegIdx = i;
          bestPoint = gp;
        }
      }
    }

    if (bestPoint && bestSegIdx >= 0) {
      onInsertPoint(bestSegIdx, bestPoint);
    }
  };

  if (area.visible === false) return null;

  return (
    <Group
      x={area.x}
      y={area.y}
      draggable={isEditable && !draggingHandle.current}
      onDragStart={(e: KonvaEventObject<DragEvent>) => {
        if (draggingHandle.current) {
          e.target.stopDrag();
        }
      }}
      onDragEnd={(e: KonvaEventObject<DragEvent>) => {
        if (!draggingHandle.current) {
          // Snap group position to grid
          const x = snapToGrid(e.target.x());
          const y = snapToGrid(e.target.y());
          e.target.x(x);
          e.target.y(y);
          onDragEnd(x, y);
        }
      }}
      onClick={isEditable ? onSelect : undefined}
      onTap={isEditable ? onSelect : undefined}
    >
      {/* Filled polygon */}
      <Line
        points={flatPts}
        closed
        fill={area.fill_color + '40'}
        stroke={area.fill_color}
        strokeWidth={2}
        hitStrokeWidth={20}
        onClick={isSelected && isEditable ? handleLineClick : undefined}
        onTap={isSelected && isEditable ? handleLineClick : undefined}
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

      {/* Midpoint indicators on edges (show possible insert points) */}
      {isSelected &&
        isEditable &&
        area.points.map((pt, idx) => {
          const next = area.points[(idx + 1) % area.points.length];
          const mx = (pt.x + next.x) / 2;
          const my = (pt.y + next.y) / 2;
          return (
            <Circle
              key={`mid-${idx}`}
              x={mx}
              y={my}
              radius={5}
              fill={area.fill_color + '60'}
              stroke={area.fill_color}
              strokeWidth={1}
              listening={false}
            />
          );
        })}

      {/* Corner handles (only when selected and editable) */}
      {isSelected &&
        isEditable &&
        area.points.map((pt, idx) => (
          <Circle
            key={`h-${idx}`}
            x={pt.x}
            y={pt.y}
            radius={HANDLE_RADIUS}
            fill="white"
            stroke={area.fill_color}
            strokeWidth={2.5}
            draggable
            onDragStart={() => {
              draggingHandle.current = true;
            }}
            onDragEnd={(e: KonvaEventObject<DragEvent>) => {
              e.cancelBubble = true;
              // Snap to grid
              const snappedX = snapToGrid(e.target.x());
              const snappedY = snapToGrid(e.target.y());
              e.target.x(snappedX);
              e.target.y(snappedY);
              onPointDragEnd(idx, { x: snappedX, y: snappedY });
              draggingHandle.current = false;
            }}
            onMouseDown={(e: KonvaEventObject<MouseEvent>) => {
              e.cancelBubble = true;
            }}
            onTouchStart={(e: KonvaEventObject<TouchEvent>) => {
              e.cancelBubble = true;
            }}
          />
        ))}
    </Group>
  );
}
