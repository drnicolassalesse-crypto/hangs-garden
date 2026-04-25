import { useRef } from 'react';
import { Group, Line, Circle, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { GardenArea, LayoutPoint } from '../../domain/types';
import { flattenPoints, polygonCentroid } from '../../domain/gardenLayout';

interface AreaShapeProps {
  area: GardenArea;
  isSelected: boolean;
  isEditable: boolean;
  onDragEnd: (x: number, y: number) => void;
  onPointDragEnd: (index: number, point: LayoutPoint) => void;
  onSelect: () => void;
}

const HANDLE_RADIUS = 12; // bigger for easier finger targeting

export function AreaShape({
  area,
  isSelected,
  isEditable,
  onDragEnd,
  onPointDragEnd,
  onSelect,
}: AreaShapeProps) {
  const flatPts = flattenPoints(area.points);
  const centroid = polygonCentroid(area.points);
  const draggingHandle = useRef(false);

  // Compute dimension label from bounding box
  const xs = area.points.map((p) => p.x);
  const ys = area.points.map((p) => p.y);
  const bboxW = Math.round(Math.max(...xs) - Math.min(...xs));
  const bboxH = Math.round(Math.max(...ys) - Math.min(...ys));
  const dimLabel = area.width_cm && area.height_cm
    ? `${area.width_cm} × ${area.height_cm} cm`
    : `${bboxW} × ${bboxH}`;

  return (
    <Group
      x={area.x}
      y={area.y}
      draggable={isEditable && !draggingHandle.current}
      onDragStart={(e: KonvaEventObject<DragEvent>) => {
        // Don't let the group drag when a handle is being dragged
        if (draggingHandle.current) {
          e.target.stopDrag();
        }
      }}
      onDragEnd={(e: KonvaEventObject<DragEvent>) => {
        if (!draggingHandle.current) {
          onDragEnd(e.target.x(), e.target.y());
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
        </>
      ) : (
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
      )}

      {/* Corner handles (only when selected and editable) */}
      {isSelected &&
        isEditable &&
        area.points.map((pt, idx) => (
          <Circle
            key={idx}
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
              onPointDragEnd(idx, { x: e.target.x(), y: e.target.y() });
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
