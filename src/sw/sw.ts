/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// SPA navigation fallback is provided via the NavigationRoute at runtime in
// generateSW mode; since we're in injectManifest we add a simple handler.
self.addEventListener('install', () => {
  void self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const data = (event.notification.data ?? {}) as {
    pot_id?: string;
    task_id?: string;
  };
  const url =
    data.pot_id && data.task_id
      ? `/plants/${data.pot_id}?task=${data.task_id}`
      : '/';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ('focus' in client) {
            void client.focus();
            if ('navigate' in client) {
              return (client as WindowClient).navigate(url);
            }
            return undefined;
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});
