import { useEffect, useState } from 'react';
import { isStandalone } from './detect';
import { t } from '../../i18n';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const KEY = 'planta.install.promptShown';

export function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(KEY) === '1') return;

    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!visible || !evt) return null;

  async function install() {
    if (!evt) return;
    try {
      await evt.prompt();
      await evt.userChoice;
    } finally {
      localStorage.setItem(KEY, '1');
      setVisible(false);
      setEvt(null);
    }
  }

  function dismiss() {
    localStorage.setItem(KEY, '1');
    setVisible(false);
  }

  return (
    <div className="fixed bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full bg-primary px-4 py-2 text-sm text-white shadow-lg">
      <span>{t('install.prompt')}</span>
      <button onClick={install} className="rounded-full bg-white/20 px-3 py-1">
        {t('install.btn')}
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="rounded-full px-1 text-white/80"
      >
        ×
      </button>
    </div>
  );
}
