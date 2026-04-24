import { careTasksRepo, potsRepo } from '../../data/repositories';
import { syncNotifications } from '../../services/notifications';
import type { UUID } from '../../domain/types';

export async function toggleTaskEnabled(
  taskId: UUID,
  enabled: boolean,
): Promise<void> {
  const task = await careTasksRepo.getById(taskId);
  if (!task) return;
  await careTasksRepo.update({ ...task, is_enabled: enabled });
  void syncNotifications();
}

export async function deletePot(potId: UUID): Promise<void> {
  await potsRepo.delete(potId);
  void syncNotifications();
}

export async function renamePot(
  potId: UUID,
  newName: string,
): Promise<void> {
  const pot = await potsRepo.getById(potId);
  if (!pot) return;
  const trimmed = newName.trim();
  if (!trimmed) return;
  await potsRepo.update({ ...pot, display_name: trimmed });
  void syncNotifications();
}
