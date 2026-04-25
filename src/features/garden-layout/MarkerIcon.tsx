import { Arrow, Circle, Group, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { LayoutMarker } from '../../domain/types';

const MARKER_RADIUS = 18;

interface MarkerIconProps {
  marker: LayoutMarker;
  isSelected: boolean;
  isEditable: boolean;
  onDragEnd: (x: number, y: number) => void;
  onRotate: (rotation: number) => void;
  onSelect: () => void;
}

export function MarkerIcon({
  marker,
  isSelected,
  isEditable,
  onDragEnd,
  onRotate,
  onSelect,
}: MarkerIconProps) {
  if (marker.type === 'water_source') {
    return (
      <WaterSourceMarker
        marker={marker}
        isSelected={isSelected}
        isEditable={isEditable}
        onDragEnd={onDragEnd}
        onSelect={onSelect}
      />
    );
  }
  return (
    <CompassMarker
      marker={marker}
      isSelected={isSelected}
      isEditable={isEditable}
      onDragEnd={onDragEnd}
      onRotate={onRotate}
      onSelect={onSelect}
    />
  );
}

// ── Water source ──────────────────────────────────────────

function WaterSourceMarker({
  marker,
  isSelected,
  isEditable,
  onDragEnd,
  onSelect,
}: Omit<MarkerIconProps, 'onRotate'>) {
  return (
    <Group
      x={marker.x}
      y={marker.y}
      draggable={isEditable}
      onDragEnd={(e: KonvaEventObject<DragEvent>) => {
        onDragEnd(e.target.x(), e.target.y());
      }}
      onClick={isEditable ? onSelect : undefined}
      onTap={isEditable ? onSelect : undefined}
    >
      {isSelected && (
        <Circle
          radius={MARKER_RADIUS + 4}
          fill="transparent"
          stroke="#2D6A4F"
          strokeWidth={2}
          dash={[4, 4]}
        />
      )}
      <Circle radius={MARKER_RADIUS} fill="#DBEAFE" stroke="#3B82F6" strokeWidth={2} />
      <Text
        x={-MARKER_RADIUS}
        y={-10}
        width={MARKER_RADIUS * 2}
        text={'\u{1F4A7}'}
        fontSize={18}
        align="center"
        listening={false}
      />
      <Text
        x={-30}
        y={MARKER_RADIUS + 4}
        width={60}
        text="Water"
        fontSize={10}
        fontFamily="Inter, system-ui, sans-serif"
        fill="#3B82F6"
        align="center"
        listening={false}
      />
    </Group>
  );
}

// ── Compass ───────────────────────────────────────────────

const COMPASS_RADIUS = 22;
const HANDLE_DIST = 38;

function CompassMarker({
  marker,
  isSelected,
  isEditable,
  onDragEnd,
  onRotate,
  onSelect,
}: MarkerIconProps) {
  const rad = (marker.rotation * Math.PI) / 180;
  // Arrow points "North" based on rotation
  const arrowTipX = Math.sin(rad) * -16;
  const arrowTipY = Math.cos(rad) * 16;

  // Rotation handle position
  const handleX = Math.sin(rad) * -HANDLE_DIST;
  const handleY = Math.cos(rad) * HANDLE_DIST;

  return (
    <Group
      x={marker.x}
      y={marker.y}
      draggable={isEditable}
      onDragEnd={(e: KonvaEventObject<DragEvent>) => {
        onDragEnd(e.target.x(), e.target.y());
      }}
      onClick={isEditable ? onSelect : undefined}
      onTap={isEditable ? onSelect : undefined}
    >
      {isSelected && (
        <Circle
          radius={COMPASS_RADIUS + 4}
          fill="transparent"
          stroke="#2D6A4F"
          strokeWidth={2}
          dash={[4, 4]}
        />
      )}
      <Circle
        radius={COMPASS_RADIUS}
        fill="#FEF3C7"
        stroke="#F59E0B"
        strokeWidth={2}
      />

      {/* North arrow */}
      <Arrow
        points={[0, 0, arrowTipX, -arrowTipY]}
        pointerLength={6}
        pointerWidth={6}
        fill="#DC2626"
        stroke="#DC2626"
        strokeWidth={2}
      />

      {/* N label */}
      <Text
        x={arrowTipX * 1.3 - 6}
        y={-arrowTipY * 1.3 - 6}
        text="N"
        fontSize={12}
        fontFamily="Inter, system-ui, sans-serif"
        fontStyle="bold"
        fill="#DC2626"
        listening={false}
      />

      {/* Center dot */}
      <Circle radius={3} fill="#F59E0B" />

      {/* Label */}
      <Text
        x={-30}
        y={COMPASS_RADIUS + 4}
        width={60}
        text="North"
        fontSize={10}
        fontFamily="Inter, system-ui, sans-serif"
        fill="#F59E0B"
        align="center"
        listening={false}
      />

      {/* Rotation handle (only when selected + editable) */}
      {isSelected && isEditable && (
        <Circle
          x={handleX}
          y={-handleY}
          radius={8}
          fill="#F59E0B"
          stroke="white"
          strokeWidth={2}
          draggable
          onDragMove={(e: KonvaEventObject<DragEvent>) => {
            const node = e.target;
            // Calculate angle from center to handle position
            const dx = node.x();
            const dy = node.y();
            const angle = (Math.atan2(-dx, dy) * 180) / Math.PI;
            onRotate((angle + 360) % 360);
          }}
          onDragEnd={(e: KonvaEventObject<DragEvent>) => {
            const node = e.target;
            const dx = node.x();
            const dy = node.y();
            const angle = (Math.atan2(-dx, dy) * 180) / Math.PI;
            onRotate((angle + 360) % 360);
            // Reset handle position (it will be recalculated from rotation)
            node.position({ x: handleX, y: -handleY });
          }}
        />
      )}
    </Group>
  );
}
