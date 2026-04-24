import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PlantaDB, __setDB } from '../../../data/db';
import { useProfileStore } from '../../../state/profileStore';

let db: PlantaDB;
let counter = 0;

beforeEach(() => {
  db = new PlantaDB(`planta-profile-test-${++counter}`);
  __setDB(db);
  // reset Zustand store between tests
  useProfileStore.setState({ profile: null, status: 'loading' });
});

afterEach(async () => {
  await db.delete();
  __setDB(null);
});

describe('profileStore', () => {
  it('load() on a fresh DB sets profile=null and status=ready', async () => {
    await useProfileStore.getState().load();
    const s = useProfileStore.getState();
    expect(s.status).toBe('ready');
    expect(s.profile).toBeNull();
  });

  it('save() persists and exposes the profile via load() on a new instance', async () => {
    await useProfileStore.getState().save({
      display_name: 'Linh',
      skill_level: 'intermediate',
      notification_frequency: 'frequent',
    });

    expect(useProfileStore.getState().profile?.display_name).toBe('Linh');

    // simulate a new app session
    useProfileStore.setState({ profile: null, status: 'loading' });
    await useProfileStore.getState().load();

    const s = useProfileStore.getState();
    expect(s.profile?.display_name).toBe('Linh');
    expect(s.profile?.skill_level).toBe('intermediate');
    expect(s.profile?.notification_frequency).toBe('frequent');
    expect(s.profile?.reminder_time).toBe('08:00');
  });

  it('save() called twice updates the same row, not a second profile', async () => {
    const store = useProfileStore.getState();
    await store.save({
      display_name: 'A',
      skill_level: 'beginner',
      notification_frequency: 'minimal',
    });
    const firstId = useProfileStore.getState().profile?.id;
    await useProfileStore.getState().save({
      display_name: 'B',
      skill_level: 'expert',
      notification_frequency: 'frequent',
    });
    const second = useProfileStore.getState().profile;
    expect(second?.id).toBe(firstId);
    expect(second?.display_name).toBe('B');
    expect(await db.profile.count()).toBe(1);
  });
});
