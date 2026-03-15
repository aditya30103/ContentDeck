import { useMemo, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { SupabaseProvider } from './context/SupabaseProvider';
import { UIProvider } from './context/UIProvider';
import { ToastProvider } from './components/ui/Toast';
import ErrorBoundary from './components/ui/ErrorBoundary';
import UpdateBanner from './components/ui/UpdateBanner';
import DemoBanner from './components/ui/DemoBanner';
import AuthScreen from './components/auth/AuthScreen';
import Dashboard from './pages/Dashboard';
import { HomePage } from './pages/HomePage';
import { createMockSupabaseClient } from './lib/mock-supabase';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';

const DEMO_KEY = 'contentdeck_demo';

function getSharedUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('url') || params.get('text') || null;
}

export default function App() {
  const { user, loading, signInWithMagicLink, signInWithGoogle, signInWithGitHub, signOut } =
    useAuth();
  useTheme();

  const isDemo = localStorage.getItem(DEMO_KEY) === 'true';
  const mockClient = useMemo(() => (isDemo ? createMockSupabaseClient() : undefined), [isDemo]);
  const sharedUrl = useMemo(getSharedUrl, []);

  const handleDemo = useCallback(() => {
    localStorage.setItem(DEMO_KEY, 'true');
    window.location.reload();
  }, []);

  const handleExitDemo = useCallback(() => {
    localStorage.removeItem(DEMO_KEY);
    window.location.reload();
  }, []);

  const handleSignOut = useCallback(async () => {
    localStorage.removeItem(DEMO_KEY);
    await signOut();
  }, [signOut]);

  const userEmail = user?.email ?? null;

  // Loading state
  if (loading && !isDemo) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-surface-50 dark:bg-surface-950">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Auth screen (not logged in, not demo)
  if (!isDemo && !user) {
    return (
      <ToastProvider>
        <AuthScreen
          onDemo={handleDemo}
          onMagicLink={signInWithMagicLink}
          onGoogle={signInWithGoogle}
          onGitHub={signInWithGitHub}
        />
        <SpeedInsights />
        <Analytics />
      </ToastProvider>
    );
  }

  return (
    <ErrorBoundary>
      <SupabaseProvider client={mockClient}>
        <UIProvider>
          <ToastProvider>
            {/* Skip nav link for accessibility */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary-600 focus:text-white focus:text-sm focus:font-medium"
            >
              Skip to main content
            </a>
            {isDemo ? <DemoBanner onSignIn={handleExitDemo} /> : <UpdateBanner />}
            <Routes>
              <Route
                path="/"
                element={
                  <HomePage
                    userEmail={userEmail}
                    onSignOut={isDemo ? handleExitDemo : handleSignOut}
                    isDemo={isDemo}
                  />
                }
              />
              <Route
                path="/library"
                element={
                  <Dashboard
                    userEmail={userEmail}
                    onSignOut={isDemo ? handleExitDemo : handleSignOut}
                    isDemo={isDemo}
                    sharedUrl={sharedUrl}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </UIProvider>
      </SupabaseProvider>
      <SpeedInsights />
      <Analytics />
    </ErrorBoundary>
  );
}
