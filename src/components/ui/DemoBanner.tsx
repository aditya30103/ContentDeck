import { FlaskConical } from 'lucide-react';

interface DemoBannerProps {
  onSignIn: () => void;
}

export default function DemoBanner({ onSignIn }: DemoBannerProps) {
  return (
    <div className="flex-none z-[60] flex items-center justify-center gap-3 px-4 py-2.5 bg-amber-500 dark:bg-amber-600 text-amber-950 text-sm font-medium shadow-lg">
      <FlaskConical size={16} />
      <span>Exploring with sample data — changes won't be saved</span>
      <button
        onClick={onSignIn}
        className="px-3 py-1 rounded-md bg-white/80 hover:bg-white text-amber-950 font-semibold transition-colors min-h-[32px]"
      >
        Sign In
      </button>
    </div>
  );
}
