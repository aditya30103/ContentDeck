import { useState } from 'react';
import { Database, BookOpen, Tags, FileText, Mail, Loader2 } from 'lucide-react';
import Button from '../ui/Button';
import { useToast } from '../ui/Toast';

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Capture',
    description: 'Save from any app — browser, YouTube, Twitter, LinkedIn. One tap on mobile.',
  },
  {
    icon: Tags,
    title: 'Organize',
    description:
      'AI-powered tagging, custom areas, and a status workflow: Unread → Reading → Done.',
  },
  {
    icon: FileText,
    title: 'Reflect',
    description:
      'Add notes, highlights, and questions. Export to Obsidian for long-term knowledge.',
  },
];

interface AuthScreenProps {
  onDemo: () => void;
  onMagicLink: (email: string) => Promise<{ error: Error | null }>;
  onGoogle: () => Promise<{ error: Error | null }>;
  onGitHub: () => Promise<{ error: Error | null }>;
}

export default function AuthScreen({ onDemo, onMagicLink, onGoogle, onGitHub }: AuthScreenProps) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const toast = useToast();

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error('Please enter your email');
      return;
    }
    setSending(true);
    const { error } = await onMagicLink(trimmed);
    setSending(false);
    if (error) {
      toast.error(error.message || 'Failed to send magic link');
    } else {
      setMagicLinkSent(true);
    }
  }

  async function handleOAuth(provider: 'google' | 'github') {
    const fn = provider === 'google' ? onGoogle : onGitHub;
    const { error } = await fn();
    if (error) {
      toast.error(error.message || `Failed to sign in with ${provider}`);
    }
  }

  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-contain bg-surface-50 dark:bg-surface-950">
      <div className="min-h-full flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary-600 flex items-center justify-center mb-4">
              <Database size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-100">
              ContentDeck
            </h1>
            <p className="text-surface-500 dark:text-surface-400 mt-2">
              Capture, organize, and reflect on everything you read.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900 p-4 text-center"
              >
                <div className="mx-auto w-10 h-10 rounded-lg bg-primary-600/10 dark:bg-primary-500/10 flex items-center justify-center mb-3">
                  <f.icon size={20} className="text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="font-semibold text-surface-900 dark:text-surface-100 mb-1">
                  {f.title}
                </h3>
                <p className="text-xs text-surface-500 dark:text-surface-400 leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>

          {/* Try Demo */}
          <div className="text-center space-y-2">
            <Button onClick={onDemo} size="lg" className="w-full sm:w-auto px-8">
              Try Demo
            </Button>
            <p className="text-xs text-surface-400 dark:text-surface-500">
              No setup required — explore with sample data
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 border-t border-surface-200 dark:border-surface-800" />
            <span className="text-xs text-surface-400 dark:text-surface-500 whitespace-nowrap">
              or sign in
            </span>
            <div className="flex-1 border-t border-surface-200 dark:border-surface-800" />
          </div>

          {/* Auth Section */}
          <div className="rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900 p-6 space-y-5">
            {magicLinkSent ? (
              <div className="text-center space-y-3 py-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Mail size={24} className="text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                  Check your email!
                </h3>
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  We sent a sign-in link to <strong>{email}</strong>
                </p>
                <button
                  type="button"
                  onClick={() => setMagicLinkSent(false)}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Use a different email
                </button>
              </div>
            ) : (
              <>
                {/* Magic Link */}
                <form onSubmit={handleMagicLink} className="space-y-3">
                  <div>
                    <label
                      htmlFor="auth-email"
                      className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
                    >
                      Email
                    </label>
                    <input
                      id="auth-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full px-3 py-2.5 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 min-h-[44px]"
                    />
                  </div>
                  <Button type="submit" disabled={sending} className="w-full">
                    {sending ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Magic Link'
                    )}
                  </Button>
                </form>

                {/* OAuth Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-surface-200 dark:border-surface-700" />
                  <span className="text-xs text-surface-400 dark:text-surface-500">or</span>
                  <div className="flex-1 border-t border-surface-200 dark:border-surface-700" />
                </div>

                {/* OAuth Buttons */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => handleOAuth('google')}
                    className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-200 font-medium text-sm hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors min-h-[44px]"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Continue with Google
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOAuth('github')}
                    className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg bg-surface-900 dark:bg-surface-100 text-white dark:text-surface-900 font-medium text-sm hover:bg-surface-800 dark:hover:bg-surface-200 transition-colors min-h-[44px]"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                    Continue with GitHub
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
