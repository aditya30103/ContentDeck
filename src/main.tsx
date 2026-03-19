import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);

// Defer Sentry init until after initial render — keeps it out of the critical JS path
const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (sentryDsn) {
  void import('@sentry/react').then(({ init, browserTracingIntegration, captureException }) => {
    init({
      dsn: sentryDsn,
      environment: import.meta.env.MODE,
      integrations: [browserTracingIntegration()],
      tracesSampleRate: 0.1,
    });
    // Catch unhandled promise rejections that Sentry's auto-capture misses in some browsers
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      captureException(event.reason);
    });
  });
}
