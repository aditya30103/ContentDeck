import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import Modal from '../ui/Modal';
import type { Bookmark } from '../../types';

// ---------------------------------------------------------------------------
// Web Speech API — minimal local types (not in TypeScript's DOM lib)
// ---------------------------------------------------------------------------

interface SpeechResult {
  readonly transcript: string;
}

interface SpeechResultList {
  readonly length: number;
  [index: number]: readonly SpeechResult[] & { length: number };
}

interface SpeechEvent {
  readonly results: SpeechResultList;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionCtor {
  new (): SpeechRecognitionLike;
}

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as Record<string, unknown>;
  const SR = (w['SpeechRecognition'] ?? w['webkitSpeechRecognition']) as
    | SpeechRecognitionCtor
    | undefined;
  return SR ?? null;
}

// Evaluated once at module load; cached for reuse in handleMicClick
const speechSR = typeof window !== 'undefined' ? getSpeechRecognitionCtor() : null;
const speechSupported = speechSR !== null;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ReflectionModalProps {
  open: boolean;
  bookmark: Bookmark | null;
  onSave: (text: string) => void;
  onSkip: () => void;
}

export default function ReflectionModal({ open, bookmark, onSave, onSkip }: ReflectionModalProps) {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // Reset state when modal opens; abort recognition and clean up when it closes
  useEffect(() => {
    if (open) {
      setText('');
      setIsListening(false);
    } else {
      // Refs are always current in effects — safe to check without deps
      if (recognitionRef.current) recognitionRef.current.abort();
      recognitionRef.current = null;
      setIsListening(false);
    }
  }, [open]);

  function handleMicClick() {
    if (isListening) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      return;
    }

    if (!speechSR) return;
    const SR = speechSR;

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e: SpeechEvent) => {
      const first = e.results[0];
      const transcript = first?.[0]?.transcript ?? '';
      setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }

  function handleSave() {
    onSave(text);
    // text resets via useEffect when open → false (parent clears pendingDoneBookmark)
  }

  function handleSkip() {
    setText('');
    onSkip();
  }

  const displayTitle = bookmark?.title ?? bookmark?.url ?? '';

  return (
    <Modal open={open} onClose={handleSkip} title="How did it go?" size="sm">
      {/* Subtitle — truncated bookmark title */}
      <p className="text-sm text-surface-500 dark:text-surface-400 mb-4 line-clamp-1">
        {displayTitle}
      </p>

      {/* Voice button — only when browser supports Web Speech API */}
      {speechSupported && (
        <button
          type="button"
          onClick={handleMicClick}
          aria-label={isListening ? 'Stop recording' : 'Start voice input'}
          className={`mb-3 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 min-h-[44px] ${
            isListening
              ? 'bg-danger-100 dark:bg-danger-900/30 text-danger-600 dark:text-danger-400 ring-2 ring-danger-400 ring-offset-1 animate-pulse'
              : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
          }`}
        >
          {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          {isListening ? 'Listening… tap to stop' : 'Voice input'}
        </button>
      )}

      {/* Text area */}
      <textarea
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What's your main takeaway?"
        className="w-full rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 px-3 py-2 text-base text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 resize-none mb-4"
      />

      {/* Footer actions */}
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={handleSkip}
          className="px-4 py-2 rounded-xl text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors focus-visible:ring-2 min-h-[44px]"
        >
          Skip for now
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={text.trim() === ''}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white transition-colors focus-visible:ring-2 min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save &amp; Done
        </button>
      </div>
    </Modal>
  );
}
