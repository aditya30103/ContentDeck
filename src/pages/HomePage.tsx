import { useState } from 'react';
import { useTagAreas } from '../hooks/useTagAreas';
import { useUserValues } from '../hooks/useUserValues';
import ValuesOnboardingModal from '../components/modals/ValuesOnboardingModal';
import type { UserValues } from '../types/scoring';

interface HomePageProps {
  userEmail: string | null;
  onSignOut: () => void;
  isDemo: boolean;
}

export function HomePage({ isDemo }: HomePageProps) {
  const { areas } = useTagAreas();
  const { values, setValues } = useUserValues();
  const [showOnboarding, setShowOnboarding] = useState(
    () => localStorage.getItem('contentdeck_values') === null && !isDemo,
  );

  function handleComplete(v: UserValues) {
    setValues(v);
    setShowOnboarding(false);
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      <header className="p-4 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between">
        <span className="font-semibold text-surface-900 dark:text-surface-100">ContentDeck</span>
        <a href="/library" className="text-sm text-primary-600 hover:underline">
          Browse Library →
        </a>
      </header>

      <main className="p-6 text-center text-surface-500 dark:text-surface-400" id="main-content">
        {values ? (
          <p className="text-sm">Home screen coming in v3.5 — scoring engine ready.</p>
        ) : (
          <p className="text-sm">Home screen coming in v3.5 — scoring engine ready.</p>
        )}
      </main>

      <ValuesOnboardingModal
        open={showOnboarding}
        areas={areas}
        onComplete={handleComplete}
        onSkip={() => setShowOnboarding(false)}
      />
    </div>
  );
}
