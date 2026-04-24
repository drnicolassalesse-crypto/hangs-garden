// Framework-free domain types. Mirrors planta-clone-spec.md §3, with PWA-specific
// adaptations: §2 Auth → local Profile; photo URLs → blob ids resolved by data layer.

export type UUID = string;

export type ActionType =
  | 'watering'
  | 'fertilizing'
  | 'misting'
  | 'repotting'
  | 'pruning'
  | 'cleaning';

export type SkillLevel = 'beginner' | 'intermediate' | 'expert';
export type NotificationFrequency = 'minimal' | 'moderate' | 'frequent';

export type Difficulty = 'easy' | 'moderate' | 'hard';
export type LightRequirement = 'low' | 'medium' | 'bright_indirect' | 'direct';
export type Toxicity =
  | 'non_toxic'
  | 'toxic_to_pets'
  | 'toxic_to_humans'
  | 'toxic_to_all';

export type PotSize = 'xs' | 's' | 'm' | 'l' | 'xl';
export type PotMaterial =
  | 'plastic'
  | 'terracotta'
  | 'ceramic'
  | 'fabric'
  | 'glass'
  | 'metal'
  | 'wood';
export type SoilType =
  | 'standard'
  | 'succulent_cactus'
  | 'orchid'
  | 'moisture_retaining'
  | 'peat_free';
export type LightLevel = 'low' | 'medium' | 'bright_indirect' | 'direct_sunlight';
export type LocationType = 'indoor' | 'outdoor' | 'greenhouse';

export type CareLogAction = 'completed' | 'skipped' | 'snoozed';
export type TaskBucket =
  | 'overdue'
  | 'today'
  | 'upcoming'
  | 'later'
  | 'snoozed';

export interface CareDefaults {
  watering_interval_days: number;
  fertilizing_interval_days: number;
  misting_interval_days: number;
  repotting_interval_days: number;
  pruning_interval_days: number;
  cleaning_interval_days: number;
}

export interface PlantSpecies {
  id: UUID;
  common_name: string;
  scientific_name: string;
  family: string;
  description: string;
  image_url: string | null;
  image_blob_id?: UUID | null;
  care_defaults: CareDefaults;
  difficulty: Difficulty;
  light_requirement: LightRequirement;
  toxicity: Toxicity;
  tags: string[];
  is_custom?: boolean;
}

export interface CustomSchedule {
  watering_interval_days: number | null;
  fertilizing_interval_days: number | null;
  misting_interval_days: number | null;
  repotting_interval_days: number | null;
  pruning_interval_days: number | null;
  cleaning_interval_days: number | null;
}

export interface Pot {
  id: UUID;
  species_id: UUID;
  display_name: string;
  photo_blob_id: UUID | null;
  site_id: UUID | null;
  created_at: number; // epoch ms
  notes: string | null;
  pot_size: PotSize;
  pot_material: PotMaterial;
  soil_type: SoilType;
  light_level: LightLevel;
  location_type: LocationType;
  use_custom_schedule: boolean;
  custom_schedule: CustomSchedule | null;
}

export interface CareTask {
  id: UUID;
  pot_id: UUID;
  action_type: ActionType;
  is_enabled: boolean;
  interval_days: number;
  last_performed_at: number | null;
  next_due_at: number;
  snooze_until: number | null;
  notes: string | null;
}

export interface CareLog {
  id: UUID;
  pot_id: UUID;
  care_task_id: UUID;
  action_type: ActionType;
  action: CareLogAction;
  performed_at: number;
  notes: string | null;
  photo_blob_id: UUID | null;
  fertilizer_id?: UUID | null;
}

export type FertilizerType =
  | 'liquid'
  | 'granular'
  | 'slow_release'
  | 'organic'
  | 'other';

export interface Fertilizer {
  id: UUID;
  name: string;
  type: FertilizerType;
  npk: string | null;
  notes: string | null;
  photo_blob_id: UUID | null;
  created_at: number;
}

export interface Site {
  id: UUID;
  name: string;
  icon: string;
  created_at: number;
}

export interface JournalEntry {
  id: UUID;
  pot_id: UUID;
  created_at: number;
  content: string;
  photo_blob_ids: UUID[];
  tags: string[];
}

// PWA replacement for spec §2 Auth — single local profile.
export interface Profile {
  id: UUID;
  display_name: string;
  avatar_blob_id: UUID | null;
  skill_level: SkillLevel;
  notification_frequency: NotificationFrequency;
  reminder_time: string; // "HH:MM" 24h
  created_at: number;
}
