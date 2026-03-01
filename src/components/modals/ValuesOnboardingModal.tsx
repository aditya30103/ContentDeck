import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import type { TagArea } from '../../types';
import type { UserValues, SessionLength } from '../../types/scoring';
import { setUserValues } from '../../hooks/useUserValues';

interface Props {
  open: boolean;
  areas: TagArea[];
  onComplete: (values: UserValues) => void;
  onSkip: () => void;
}

const SESSION_OPTIONS: Array<{
  value: SessionLength;
  label: string;
  sublabel: string;
  icon: string;
}> = [
  { value: 'quick', label: 'Quick', sublabel: '≤15 min', icon: '⚡' },
  { value: 'medium', label: 'Medium', sublabel: '~30 min', icon: '📖' },
  { value: 'deep', label: 'Deep', sublabel: '1h+', icon: '🔥' },
];

export default function ValuesOnboardingModal({ open, areas, onComplete, onSkip }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [priorityAreaIds, setPriorityAreaIds] = useState<string[]>([]);
  const [sessionLength, setSessionLength] = useState<SessionLength>('medium');
  const [suppressedAreaIds, setSuppressedAreaIds] = useState<string[]>([]);

  function togglePriority(id: string) {
    setPriorityAreaIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleSuppressed(id: string) {
    if (priorityAreaIds.includes(id)) return; // priority areas can't be suppressed
    setSuppressedAreaIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function handleComplete() {
    const values: UserValues = {
      priorityAreaIds,
      sessionLength,
      suppressedAreaIds,
      completedAt: new Date().toISOString(),
      version: 1,
    };
    setUserValues(values);
    onComplete(values);
  }

  const progressDots = [1, 2, 3].map((n) => (
    <span
      key={n}
      className={`inline-block w-2 h-2 rounded-full ${n <= step ? 'bg-primary-600' : 'bg-surface-300 dark:bg-surface-600'}`}
    />
  ));

  const hasAreas = areas.length > 0;

  return (
    <Modal open={open} onClose={onSkip} title="Set your reading values">
      {/* Progress dots */}
      <div className="flex items-center gap-2 mb-6">{progressDots}</div>

      {/* Step 1: Priority areas */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-surface-600 dark:text-surface-400">
            Which areas matter most to you?
          </p>
          {hasAreas ? (
            <div className="flex flex-wrap gap-2">
              {areas.map((area) => {
                const isSelected = priorityAreaIds.includes(area.id);
                return (
                  <button
                    key={area.id}
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    onClick={() => togglePriority(area.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                      text-white transition-all min-h-[44px]
                      ${isSelected ? 'ring-2 ring-primary-500 scale-105' : 'opacity-70 hover:opacity-100'}`}
                    style={{ backgroundColor: area.color ?? '#6366f1' }}
                  >
                    {area.emoji} {area.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-surface-500 dark:text-surface-400 py-4">
              Create some areas in the library first — they'll appear here. You can revisit this
              setup any time from Settings.
            </p>
          )}
          <div className="flex justify-end pt-2">
            <Button onClick={() => setStep(2)}>Continue →</Button>
          </div>
        </div>
      )}

      {/* Step 2: Session length */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-surface-600 dark:text-surface-400">
            What's a typical reading session?
          </p>
          <div className="grid grid-cols-3 gap-3">
            {SESSION_OPTIONS.map(({ value, label, sublabel, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setSessionLength(value)}
                className={`flex flex-col items-center gap-1 py-4 px-2 rounded-xl border-2 text-sm font-medium transition-all min-h-[80px]
                  ${
                    sessionLength === value
                      ? 'border-primary-500 bg-primary-600/10 text-primary-700 dark:text-primary-300'
                      : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:border-surface-300 dark:hover:border-surface-600'
                  }`}
              >
                <span className="text-2xl">{icon}</span>
                <span>{label}</span>
                <span className="text-xs opacity-70">{sublabel}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={() => setStep(1)}>
              ← Back
            </Button>
            <Button onClick={() => setStep(3)}>Continue →</Button>
          </div>
        </div>
      )}

      {/* Step 3: Suppressed areas */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-surface-600 dark:text-surface-400">
            Any topics you want less of? <span className="text-surface-400">(Optional)</span>
          </p>
          {hasAreas ? (
            <div className="flex flex-wrap gap-2">
              {areas.map((area) => {
                const isPriority = priorityAreaIds.includes(area.id);
                const isSuppressed = suppressedAreaIds.includes(area.id);
                return (
                  <button
                    key={area.id}
                    type="button"
                    role="checkbox"
                    aria-checked={isSuppressed}
                    disabled={isPriority}
                    onClick={() => toggleSuppressed(area.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                      text-white transition-all min-h-[44px]
                      ${isPriority ? 'opacity-30 cursor-not-allowed' : ''}
                      ${isSuppressed && !isPriority ? 'ring-2 ring-red-400 scale-105' : ''}
                      ${!isSuppressed && !isPriority ? 'opacity-70 hover:opacity-100' : ''}`}
                    style={{ backgroundColor: area.color ?? '#6366f1' }}
                  >
                    {area.emoji} {area.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-surface-500 dark:text-surface-400 py-4">
              No areas to configure yet.
            </p>
          )}
          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={() => setStep(2)}>
              ← Back
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onSkip}>
                Skip
              </Button>
              <Button onClick={handleComplete}>✓ Set my values</Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
