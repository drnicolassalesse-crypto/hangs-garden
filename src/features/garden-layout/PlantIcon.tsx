import { Circle, Group, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { PlantPlacement } from '../../domain/types';
import type { PlantSummary } from '../../domain/plantSummary';
import {
  CARE_STATUS_COLORS,
  getPlantCareStatus,
} from '../../domain/gardenLayout';

const ICON_RADIUS = 22;
const BADGE_RADIUS = 8;

const ACTION_EMOJI: Record<string, string> = {
  watering: '\u{1F4A7}',
  fertilizing: '\u{1F33F}',
  misting: '\u{1F4A8}',
  repotting: '\u{1FAB4}',
  pruning: '\u{2702}',
  cleaning: '\u{1F9F9}',
};

interface PlantIconProps {
  placement: PlantPlacement;
  summary: PlantSummary;
  isSelected: boolean;
  isEditable: boolean;
  onDragEnd: (x: number, y: number) => void;
  onTap: () => void;
}

export function PlantIcon({
  placement,
  summary,
  isSelected,
  isEditable,
  onDragEnd,
  onTap,
}: PlantIconProps) {
  const status = getPlantCareStatus(summary);
  const ringColor = CARE_STATUS_COLORS[status];
  const emoji = '\u{1FAB4}'; // default plant emoji
  const taskEmoji = summary.nextDueTask
    ? ACTION_EMOJI[summary.nextDueTask.action_type] ?? ''
    : '';

  return (
    <Group
      x={placement.x}
      y={placement.y}
      draggable={isEditable}
      onDragEnd={(e: KonvaEventObject<DragEvent>) => {
        onDragEnd(e.target.x(), e.target.y());
      }}
      onClick={onTap}
      onTap={onTap}
    >
      {/* Selection highlight */}
      {isSelected && (
        <Circle
          radius={ICON_RADIUS + 4}
          fill="transparent"
          stroke="#2D6A4F"
          strokeWidth={2}
          dash={[4, 4]}
        />
      )}

      {/* Colored status ring */}
      <Circle
        radius={ICON_RADIUS}
        fill="white"
        stroke={ringColor}
        strokeWidth={3}
      />

      {/* Plant emoji */}
      <Text
        x={-ICON_RADIUS + 4}
        y={-10}
        width={ICON_RADIUS * 2 - 8}
        text={emoji}
        fontSize={18}
        align="center"
        listening={false}
      />

      {/* Plant name below */}
      <Text
        x={-35}
        y={ICON_RADIUS + 4}
        width={70}
        text={summary.pot.display_name}
        fontSize={10}
        fontFamily="Inter, system-ui, sans-serif"
        fill="#1B1B1B"
        align="center"
        ellipsis
        wrap="none"
        listening={false}
      />

      {/* Task badge (top-right) */}
      {status !== 'ok' && taskEmoji && (
        <Group x={ICON_RADIUS - 4} y={-ICON_RADIUS + 4}>
          <Circle radius={BADGE_RADIUS} fill={ringColor} />
          <Text
            x={-BADGE_RADIUS}
            y={-6}
            width={BADGE_RADIUS * 2}
            text={taskEmoji}
            fontSize={10}
            align="center"
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
}
