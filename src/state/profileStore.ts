import { create } from 'zustand';
import { profileRepo } from '../data/repositories';
import { newId } from '../data/ids';
import type {
  NotificationFrequency,
  Profile,
  SkillLevel,
} from '../domain/types';

export type ProfileStatus = 'loading' | 'ready';

interface ProfileState {
  profile: Profile | null;
  status: ProfileStatus;
  load(): Promise<void>;
  save(input: {
    display_name: string;
    skill_level: SkillLevel;
    notification_frequency: NotificationFrequency;
  }): Promise<void>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  status: 'loading',

  async load() {
    const profile = await profileRepo.get();
    set({ profile, status: 'ready' });
  },

  async save(input) {
    const existing = get().profile;
    const profile: Profile = existing
      ? {
          ...existing,
          display_name: input.display_name,
          skill_level: input.skill_level,
          notification_frequency: input.notification_frequency,
        }
      : {
          id: newId(),
          display_name: input.display_name,
          avatar_blob_id: null,
          skill_level: input.skill_level,
          notification_frequency: input.notification_frequency,
          reminder_time: '08:00',
          created_at: Date.now(),
        };
    await profileRepo.upsert(profile);
    set({ profile });
  },
}));
