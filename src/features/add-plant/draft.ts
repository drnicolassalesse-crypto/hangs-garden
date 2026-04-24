import type {
  LightLevel,
  LocationType,
  PotMaterial,
  PotSize,
  SoilType,
  UUID,
} from '../../domain/types';

export interface AddPlantDraft {
  species_id: UUID | null;
  display_name: string;
  photo_blob_id: UUID | null;
  site_id: UUID | null;
  pot_size: PotSize;
  pot_material: PotMaterial;
  soil_type: SoilType;
  light_level: LightLevel;
  location_type: LocationType;
  notes: string | null;
  last_watered_at: number | null;
  last_fertilized_at: number | null;
}

export function defaultDraft(): AddPlantDraft {
  return {
    species_id: null,
    display_name: '',
    photo_blob_id: null,
    site_id: null,
    pot_size: 'm',
    pot_material: 'plastic',
    soil_type: 'standard',
    light_level: 'medium',
    location_type: 'indoor',
    notes: null,
    last_watered_at: null,
    last_fertilized_at: null,
  };
}
