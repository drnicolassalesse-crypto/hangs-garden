import { useEffect, type ReactNode } from 'react';
import { useProfileStore } from '../../state/profileStore';
import { OnboardingFlow } from './OnboardingFlow';

export function OnboardingGate({ children }: { children: ReactNode }) {
  const status = useProfileStore((s) => s.status);
  const profile = useProfileStore((s) => s.profile);
  const load = useProfileStore((s) => s.load);

  useEffect(() => {
    if (status === 'loading') void load();
  }, [status, load]);

  if (status === 'loading') {
    return <div className="min-h-dvh bg-surface" />;
  }

  if (!profile) return <OnboardingFlow />;

  return <>{children}</>;
}
