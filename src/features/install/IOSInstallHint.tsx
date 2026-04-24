import { useEffect, useState } from 'react';
import { isIOSSafari, isStandalone } from './detect';
import { t } from '../../i18n';

const KEY = 'planta.install.iosHintDismissed';

export function IOSInstallHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIOSSafari()) return;
    if (isStandalone()) return;
    if (localStorage.getItem(KEY) === '1') return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(KEY, '1');
    setVisible(false);
  }

  return (
    <div className="fixed bottom-3 left-3 right-3 z-30 rounded-2xl bg-primary/95 p-3 text-white shadow-lg backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 text-sm">
          <div className="font-medium">{t('install.ios.title')}</div>
          <p
            className="mt-1 text-white/85"
            dangerouslySetInnerHTML={{ __html: t('install.ios.body') }}
          />
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="rounded-full px-2 text-white/90"
        >
          ×
        </button>
      </div>
    </div>
  );
}
