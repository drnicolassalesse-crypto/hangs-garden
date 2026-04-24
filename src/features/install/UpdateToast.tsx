import { useEffect, useState } from 'react';
import { registerSW as register } from 'virtual:pwa-register';
import { t } from '../../i18n';

export function UpdateToast() {
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState<
    ((reload?: boolean) => Promise<void>) | null
  >(null);

  useEffect(() => {
    if (import.meta.env.DEV) return;
    const fn = register({
      immediate: true,
      onNeedRefresh() {
        setNeedsRefresh(true);
      },
      onOfflineReady() {
        /* optional: could show a tiny toast */
      },
    });
    setUpdateSW(() => fn);
  }, []);

  if (!needsRefresh) return null;

  return (
    <div className="fixed bottom-16 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg">
      <span>{t('install.update')}</span>
      <button
        onClick={() => updateSW?.(true)}
        className="rounded-full bg-white/20 px-3 py-1"
      >
        {t('install.updateBtn')}
      </button>
      <button
        onClick={() => setNeedsRefresh(false)}
        aria-label={t('install.dismiss')}
        className="rounded-full px-1 text-white/80"
      >
        ×
      </button>
    </div>
  );
}
