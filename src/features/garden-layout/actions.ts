import { sitesRepo } from '../../data/repositories';
import type { GardenLayout, UUID } from '../../domain/types';

export async function saveLayout(
  siteId: UUID,
  layout: GardenLayout,
): Promise<void> {
  await sitesRepo.saveLayout(siteId, layout);
}

export async function deleteLayout(siteId: UUID): Promise<void> {
  await sitesRepo.clearLayout(siteId);
}
