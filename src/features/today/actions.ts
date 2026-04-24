import {
  applyComplete,
  applySkip,
  applySnooze,
} from '../../domain/schedule';
import { careLogsRepo, careTasksRepo } from '../../data/repositories';
import { syncNotifications } from '../../services/notifications';
import type { UUID } from '../../domain/types';

export async function completeTask(
  taskId: UUID,
  fertilizerId: UUID | null = null,
  now: number = Date.now(),
) {
  const task = await careTasksRepo.getById(taskId);
  if (!task) return;
  const { task: updated, log } = applyComplete(task, now);
  const enriched =
    task.action_type === 'fertilizing'
      ? { ...log, fertilizer_id: fertilizerId }
      : log;
  await careTasksRepo.update(updated);
  await careLogsRepo.appendMany([enriched]);
  void syncNotifications();
}

export async function skipTask(taskId: UUID, now: number = Date.now()) {
  const task = await careTasksRepo.getById(taskId);
  if (!task) return;
  const { task: updated, log } = applySkip(task, now);
  await careTasksRepo.update(updated);
  await careLogsRepo.appendMany([log]);
  void syncNotifications();
}

export async function snoozeTask(
  taskId: UUID,
  until: number,
  now: number = Date.now(),
) {
  const task = await careTasksRepo.getById(taskId);
  if (!task) return;
  const { task: updated, log } = applySnooze(task, until, now);
  await careTasksRepo.update(updated);
  await careLogsRepo.appendMany([log]);
  void syncNotifications();
}
