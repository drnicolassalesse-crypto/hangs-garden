import { speciesRepo } from '../../data/repositories';
import { newId } from '../../data/ids';
import type {
  CareDefaults,
  Difficulty,
  LightRequirement,
  PlantSpecies,
  Toxicity,
  UUID,
} from '../../domain/types';

export interface CustomSpeciesInput {
  common_name: string;
  scientific_name?: string;
  vi_name?: string;
  family?: string;
  description?: string;
  image_blob_id?: UUID | null;
  difficulty: Difficulty;
  light_requirement: LightRequirement;
  toxicity: Toxicity;
  care_defaults: CareDefaults;
}

function tagsFromInput(input: { vi_name?: string }): string[] {
  const tags = ['custom'];
  if (input.vi_name?.trim()) {
    tags.unshift(`vi_name:${input.vi_name.trim()}`);
  }
  return tags;
}

export async function createCustomSpecies(
  input: CustomSpeciesInput,
): Promise<PlantSpecies> {
  const record: PlantSpecies = {
    id: newId(),
    common_name: input.common_name.trim(),
    scientific_name: input.scientific_name?.trim() ?? '',
    family: input.family?.trim() ?? '',
    description: input.description?.trim() ?? '',
    image_url: null,
    image_blob_id: input.image_blob_id ?? null,
    care_defaults: input.care_defaults,
    difficulty: input.difficulty,
    light_requirement: input.light_requirement,
    toxicity: input.toxicity,
    tags: tagsFromInput(input),
    is_custom: true,
  };
  await speciesRepo.bulkUpsert([record]);
  return record;
}

export async function updateCustomSpecies(
  id: UUID,
  input: CustomSpeciesInput,
): Promise<PlantSpecies> {
  const existing = await speciesRepo.getById(id);
  if (!existing) throw new Error('Species not found');
  if (!existing.is_custom) {
    throw new Error('Cannot edit a bundled species');
  }
  const updated: PlantSpecies = {
    ...existing,
    common_name: input.common_name.trim(),
    scientific_name: input.scientific_name?.trim() ?? '',
    family: input.family?.trim() ?? '',
    description: input.description?.trim() ?? '',
    image_blob_id: input.image_blob_id ?? null,
    care_defaults: input.care_defaults,
    difficulty: input.difficulty,
    light_requirement: input.light_requirement,
    toxicity: input.toxicity,
    tags: tagsFromInput(input),
  };
  await speciesRepo.bulkUpsert([updated]);
  return updated;
}

export async function deleteCustomSpecies(id: UUID): Promise<void> {
  const existing = await speciesRepo.getById(id);
  if (!existing) return;
  if (!existing.is_custom) {
    throw new Error('Cannot delete a bundled species');
  }
  // Dexie Table has no delete in speciesRepo yet; add inline via bulk delete.
  const { getDB } = await import('../../data/db');
  await getDB().plant_species.delete(id);
}
