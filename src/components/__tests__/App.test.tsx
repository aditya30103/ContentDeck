import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock heavy child components as simple stubs
vi.mock('../../pages/Dashboard', () => ({
  default: (props: { isDemo?: boolean }) => (
    <div data-testid="dashboard" data-demo={props.isDemo} />
  ),
}));

vi.mock('../auth/AuthScreen', () => ({
  default: (props: { onDemo: () => void }) => (
    <div data-testid="auth-screen">
      <button data-testid="demo-btn" onClick={props.onDemo}>
        Demo
      </button>
    </div>
  ),
}));

vi.mock('../ui/DemoBanner', () => ({
  default: () => <div data-testid="demo-banner" />,
}));

vi.mock('../ui/UpdateBanner', () => ({
  default: () => <div data-testid="update-banner" />,
}));

vi.mock('../ui/ErrorBoundary', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@vercel/speed-insights/react', () => ({
  SpeedInsights: () => null,
}));

vi.mock('@vercel/analytics/react', () => ({
  Analytics: () => null,
}));

// Mock useTheme to avoid side effects
vi.mock('../../hooks/useTheme', () => ({
  useTheme: vi.fn(),
}));

// Mock useAuth — controlled per test
const mockUseAuth = vi.fn();
vi.mock('../../hooks/useAuth', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  useAuth: () => mockUseAuth(),
}));

// Mock createMockSupabaseClient
vi.mock('../../lib/mock-supabase', () => ({
  createMockSupabaseClient: () => ({ mock: true }),
}));

// Mock window.location.reload
const reloadMock = vi.fn();
Object.defineProperty(window, 'location', {
  value: {
    ...window.location,
    origin: 'https://contentdeck.vercel.app',
    search: '',
    reload: reloadMock,
  },
  writable: true,
});

import App from '../../App';

function authState(overrides: Partial<ReturnType<typeof mockUseAuth>> = {}) {
  return {
    user: null,
    session: null,
    loading: false,
    signInWithMagicLink: vi.fn(),
    signInWithGoogle: vi.fn(),
    signInWithGitHub: vi.fn(),
    signOut: vi.fn(),
    ...overrides,
  };
}

describe('App', () => {
  beforeEach(() => {
    reloadMock.mockClear();
    window.location.search = '';
  });

  it('renders loading spinner while auth is loading', () => {
    mockUseAuth.mockReturnValue(authState({ loading: true }));
    const { container } = render(<App />);
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('renders AuthScreen when not logged in and not demo', () => {
    mockUseAuth.mockReturnValue(authState());
    render(<App />);
    expect(screen.getByTestId('auth-screen')).toBeInTheDocument();
  });

  it('renders Dashboard when user is logged in', () => {
    mockUseAuth.mockReturnValue(authState({ user: { id: 'u1', email: 'test@test.com' } as never }));
    render(<App />);
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('update-banner')).toBeInTheDocument();
  });

  it('renders Dashboard with DemoBanner in demo mode', () => {
    localStorage.setItem('contentdeck_demo', 'true');
    mockUseAuth.mockReturnValue(authState());
    render(<App />);
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('demo-banner')).toBeInTheDocument();
  });

  it('skips loading spinner in demo mode even if auth is loading', () => {
    localStorage.setItem('contentdeck_demo', 'true');
    mockUseAuth.mockReturnValue(authState({ loading: true }));
    render(<App />);
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  it('extracts shared URL from ?url= query param', () => {
    window.location.search = '?url=https%3A%2F%2Fexample.com';
    mockUseAuth.mockReturnValue(authState({ user: { id: 'u1', email: 'test@test.com' } as never }));
    render(<App />);
    const dashboard = screen.getByTestId('dashboard');
    expect(dashboard).toBeInTheDocument();
  });
});
