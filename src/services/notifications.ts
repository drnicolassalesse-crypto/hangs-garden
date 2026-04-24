import {
  capToPlatformLimit,
  planNotifications,
  type PlannedNotification,
} from '../domain/notifications';
import {
  careTasksRepo,
  potsRepo,
  profileRepo,
  speciesRepo,
} from '../data/repositories';
import type { UUID } from '../domain/types';

let inFlight: Promise<void> | null = null;
const fallbackTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export async function syncNotifications(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      if (!isNotificationSupported() || Notification.permission !== 'granted') {
        clearFallbackTimers();
        return;
      }

      const [profile, tasks, pots, species] = await Promise.all([
        profileRepo.get(),
        careTasksRepo.listAllEnabled(),
        potsRepo.listAll(),
        speciesRepo.listAll(),
      ]);
      if (!profile) return;

      const planned = capToPlatformLimit(
        planNotifications({
          tasks,
          pots: new Map(pots.map((p) => [p.id, p])),
          species: new Map(species.map((s) => [s.id, s])),
          frequency: profile.notification_frequency,
          reminderTime: profile.reminder_time,
          now: Date.now(),
        }),
      );

      await cancelAllScheduled();

      const reg = await getRegistration();
      for (const n of planned) {
        await scheduleOne(reg, n);
      }
    } catch (err) {
      console.warn('syncNotifications failed', err);
    }
  })();
  try {
    await inFlight;
  } finally {
    inFlight = null;
  }
}

export async function cancelAllScheduled(): Promise<void> {
  clearFallbackTimers();
  const reg = await getRegistration();
  if (!reg) return;
  try {
    const existing = await reg.getNotifications();
    for (const n of existing) n.close();
  } catch {
    // Safari doesn't support getNotifications; ignore.
  }
}

async function scheduleOne(
  reg: ServiceWorkerRegistration | null,
  n: PlannedNotification,
): Promise<void> {
  const payload: NotificationOptions & {
    showTrigger?: unknown;
    tag?: string;
    data?: unknown;
  } = {
    body: n.body,
    tag: n.id,
    data: { task_id: n.task_id, pot_id: n.pot_id, kind: n.kind },
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
  };

  // Notification Triggers API (Chromium on Android) — fires even when the tab is closed.
  // It's experimental and gated behind an origin trial; we feature-detect.
  const TimestampTrigger = (
    window as unknown as { TimestampTrigger?: new (ts: number) => unknown }
  ).TimestampTrigger;

  if (reg && TimestampTrigger) {
    try {
      payload.showTrigger = new TimestampTrigger(n.fire_at);
      await reg.showNotification(n.title, payload);
      return;
    } catch {
      // fall through to fallback
    }
  }

  // Foreground fallback — fires only while the tab is alive.
  const delay = Math.max(0, n.fire_at - Date.now());
  const timer = setTimeout(() => {
    if (reg) {
      reg.showNotification(n.title, payload).catch(() => {
        // last-resort: native Notification (blocks if permission not granted)
        if (isNotificationSupported() && Notification.permission === 'granted') {
          new Notification(n.title, payload);
        }
      });
    } else if (isNotificationSupported() && Notification.permission === 'granted') {
      new Notification(n.title, payload);
    }
    fallbackTimers.delete(n.id);
  }, delay);
  fallbackTimers.set(n.id, timer);
}

function clearFallbackTimers() {
  for (const t of fallbackTimers.values()) clearTimeout(t);
  fallbackTimers.clear();
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator)
  ) {
    return null;
  }
  try {
    return (await navigator.serviceWorker.getRegistration()) ?? null;
  } catch {
    return null;
  }
}

const DISMISS_KEY = 'planta.notifBanner.dismissed';

export function notifBannerDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissNotifBanner(): void {
  try {
    localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    /* noop */
  }
}

// Convenience used by message handlers after the SW dispatches a click.
export function deepLinkForNotification(data: {
  pot_id: UUID;
  task_id: UUID;
}): string {
  return `/plants/${data.pot_id}?task=${data.task_id}`;
}
