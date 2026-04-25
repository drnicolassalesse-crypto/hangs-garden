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

const HANDLE_RADIUS = 8;

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

  return (
    <Group
      x={area.x}
      y={area.y}
      draggable={isEditable}
      onDragEnd={(e: KonvaEventObject<DragEvent>) => {
        onDragEnd(e.target.x(), e.target.y());
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
      {area.label && (
        <Text
          x={centroid.x - 50}
          y={centroid.y - 8}
          width={100}
          text={area.label}
          fontSize={14}
          fontFamily="Inter, system-ui, sans-serif"
          fill="#1B1B1B"
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
            strokeWidth={2}
            draggable
            onDragMove={(e: KonvaEventObject<DragEvent>) => {
              // Live preview: update position as user drags
              const node = e.target;
              onPointDragEnd(idx, { x: node.x(), y: node.y() });
            }}
            onDragEnd={(e: KonvaEventObject<DragEvent>) => {
              onPointDragEnd(idx, { x: e.target.x(), y: e.target.y() });
            }}
          />
        ))}
    </Group>
  );
}
