import {
  buildInitialTasks,
  computeNextDueAt,
} from '../../domain/schedule';
import type { CareTask, PlantSpecies, Pot } from '../../domain/types';
import { newId } from '../../data/ids';
import { potsRepo } from '../../data/repositories';
import { syncNotifications } from '../../services/notifications';
import type { AddPlantDraft } from './draft';

export interface SaveDraftResult {
  pot: Pot;
  tasks: CareTask[];
}

export async function saveDraft(
  draft: AddPlantDraft,
  species: PlantSpecies,
  now: number = Date.now(),
): Promise<SaveDraftResult> {
  if (!draft.species_id) throw new Error('species_id is required');
  if (draft.species_id !== species.id) {
    throw new Error('species record does not match draft.species_id');
  }
  const display_name = draft.display_name.trim() || species.common_name;

  const pot: Pot = {
    id: newId(),
    species_id: species.id,
    display_name,
    photo_blob_id: draft.photo_blob_id,
    site_id: draft.site_id,
    created_at: now,
    notes: draft.notes,
    pot_size: draft.pot_size,
    pot_material: draft.pot_material,
    soil_type: draft.soil_type,
    light_level: draft.light_level,
    location_type: draft.location_type,
    use_custom_schedule: false,
    custom_schedule: null,
  };

  const tasks = buildInitialTasks(pot, species, newId);

  // Apply optional last-care dates from Step 5 (§5.7 Step 5).
  // Per §8.4: if last_performed_at is in the past, next_due_at may be in the past
  // and the task will surface as overdue immediately. That is intended.
  applyLastDate(tasks, 'watering', draft.last_watered_at, pot);
  applyLastDate(tasks, 'fertilizing', draft.last_fertilized_at, pot);

  await potsRepo.create(pot, tasks);
  void syncNotifications();
  return { pot, tasks };
}

function applyLastDate(
  tasks: CareTask[],
  action: CareTask['action_type'],
  last: number | null,
  pot: Pot,
): void {
  if (last === null) return;
  const t = tasks.find((task) => task.action_type === action);
  if (!t) return;
  t.last_performed_at = last;
  t.next_due_at = computeNextDueAt(t, pot);
}
