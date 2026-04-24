import { useEffect, useState } from 'react';
import {
  dismissNotifBanner,
  isNotificationSupported,
  notifBannerDismissed,
  notificationPermission,
  requestPermission,
  syncNotifications,
} from '../../services/notifications';
import { t } from '../../i18n';

export function NotificationBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isNotificationSupported()) return;
    if (notifBannerDismissed()) return;
    if (notificationPermission() === 'default') setVisible(true);
  }, []);

  if (!visible) return null;

  async function enable() {
    const result = await requestPermission();
    if (result === 'granted') {
      await syncNotifications();
    }
    setVisible(false);
  }

  function dismiss() {
    dismissNotifBanner();
    setVisible(false);
  }

  return (
    <div className="mb-3 flex items-start gap-3 rounded-2xl bg-primary/10 p-3 text-sm">
      <div className="text-xl">🔔</div>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-ink">{t('notifBanner.title')}</div>
        <p className="text-xs text-ink-muted">
          {t('notifBanner.body')}
        </p>
        <div className="mt-2 flex gap-2">
          <button
            onClick={enable}
            className="rounded-full bg-primary px-3 py-1.5 text-xs text-white"
          >
            {t('notifBanner.enable')}
          </button>
          <button
            onClick={dismiss}
            className="rounded-full px-3 py-1.5 text-xs text-ink-muted"
          >
            {t('notifBanner.notNow')}
          </button>
        </div>
      </div>
    </div>
  );
}
