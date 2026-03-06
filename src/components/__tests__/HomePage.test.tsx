import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from '../../pages/HomePage';
import type { Bookmark } from '../../types';

// ---------------------------------------------------------------------------
// Module mocks (hoisted by Vitest)
// ---------------------------------------------------------------------------

vi.mock('../../hooks/useScoring', () => ({ useScoring: vi.fn() }));
vi.mock('../../hooks/useBookmarks', () => ({ useBookmarks: vi.fn() }));
vi.mock('../../hooks/useTagAreas', () => ({ useTagAreas: vi.fn() }));
vi.mock('../../hooks/useUserValues', () => ({ useUserValues: vi.fn() }));
vi.mock('../../hooks/useSpacedReview', () => ({ useSpacedReview: vi.fn() }));
vi.mock('../../lib/spaced-review', () => ({
  getReflectionNote: vi.fn(() => 'A reflection note'),
  nextReviewState: vi.fn(() => ({ interval: 6, repetitions: 1, dueAt: '' })),
}));
vi.mock('../../lib/scoring', () => ({ getReadingMinutes: vi.fn(() => 12) }));
vi.mock('../../components/modals/SettingsModal', () => ({
  default: ({ open }: { open: boolean }) => (open ? <div data-testid="settings-modal" /> : null),
}));
vi.mock('../../components/modals/ValuesOnboardingModal', () => ({
  default: ({ open }: { open: boolean }) => (open ? <div data-testid="onboarding-modal" /> : null),
}));
vi.mock('../../components/modals/ReflectionModal', () => ({
  default: ({
    open,
    onCancel,
    onSkip,
  }: {
    open: boolean;
    onCancel: () => void;
    onSkip: () => void;
  }) =>
    open ? (
      <div data-testid="reflection-modal">
        <button onClick={onCancel}>Go back</button>
        <button onClick={onSkip}>Skip</button>
      </div>
    ) : null,
}));
vi.mock('../../components/modals/ReviewModal', () => ({
  default: ({ open }: { open: boolean }) => (open ? <div data-testid="review-modal" /> : null),
}));
vi.mock('../../components/ui/Badge', () => ({
  SourceBadge: () => <span data-testid="source-badge" />,
}));

import { useScoring } from '../../hooks/useScoring';
import { useBookmarks } from '../../hooks/useBookmarks';
import { useTagAreas } from '../../hooks/useTagAreas';
import { useUserValues } from '../../hooks/useUserValues';
import { useSpacedReview } from '../../hooks/useSpacedReview';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: 'b1',
    url: 'https://example.com/article',
    title: 'Test Article Title',
    image: null,
    excerpt: null,
    source_type: 'blog',
    status: 'unread',
    is_favorited: false,
    notes: [],
    tags: [],
    areas: [],
    metadata: {},
    content: {},
    content_status: 'pending',
    content_fetched_at: null,
    synced: false,
    created_at: new Date().toISOString(),
    status_changed_at: new Date().toISOString(),
    started_reading_at: null,
    finished_at: null,
    ...overrides,
  };
}

const defaultProps = {
  userEmail: 'test@example.com',
  onSignOut: vi.fn(),
  isDemo: false,
};

function renderHome(props: Partial<typeof defaultProps> = {}) {
  return render(
    <MemoryRouter>
      <HomePage {...defaultProps} {...props} />
    </MemoryRouter>,
  );
}

const mockCycleStatusMutate = vi.fn();

function setupDefaultMocks() {
  vi.mocked(useTagAreas).mockReturnValue({ areas: [] } as unknown as ReturnType<
    typeof useTagAreas
  >);
  vi.mocked(useUserValues).mockReturnValue({
    values: null,
    setValues: vi.fn(),
    clearValues: vi.fn(),
  });
  vi.mocked(useBookmarks).mockReturnValue({
    bookmarks: [],
    isLoading: false,
    cycleStatus: {
      mutate: mockCycleStatusMutate,
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useBookmarks>['cycleStatus'],
    addNote: {
      mutate: vi.fn(),
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useBookmarks>['addNote'],
    updateBookmark: {
      mutate: vi.fn(),
      mutateAsync: vi.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof useBookmarks>['updateBookmark'],
  } as unknown as ReturnType<typeof useBookmarks>);
  vi.mocked(useScoring).mockReturnValue({
    topPick: null,
    continueItem: null,
    quickWin: null,
    ctx: {} as ReturnType<typeof useScoring>['ctx'],
  });
  vi.mocked(useSpacedReview).mockReturnValue({ reviewItem: null });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HomePage', () => {
  beforeEach(() => {
    setupDefaultMocks();
    // Set contentdeck_values so onboarding doesn't show by default
    localStorage.setItem('contentdeck_values', JSON.stringify({ version: 1 }));
  });

  it('1. renders greeting text without crashing', () => {
    renderHome();
    // Greeting text contains "Good" (morning/afternoon/evening)
    expect(screen.getByText(/Good (morning|afternoon|evening)/i)).toBeInTheDocument();
  });

  it('2. shows empty state message when topPick is null', () => {
    renderHome();
    expect(screen.getByText(/Your queue is clear/i)).toBeInTheDocument();
    expect(screen.getByText(/Add something to read/i)).toBeInTheDocument();
  });

  it('3. shows primary pick card title when topPick has a bookmark', () => {
    const bookmark = makeBookmark({ title: 'The Art of Thinking Clearly' });
    vi.mocked(useScoring).mockReturnValue({
      topPick: { bookmark, reason: 'Waited 10 days.' },
      continueItem: null,
      quickWin: null,
      ctx: {} as ReturnType<typeof useScoring>['ctx'],
    });
    renderHome();
    expect(screen.getByText('The Art of Thinking Clearly')).toBeInTheDocument();
  });

  it('4. shows reason text from topPick.reason', () => {
    const bookmark = makeBookmark();
    vi.mocked(useScoring).mockReturnValue({
      topPick: { bookmark, reason: 'This has been waiting 21 days.' },
      continueItem: null,
      quickWin: null,
      ctx: {} as ReturnType<typeof useScoring>['ctx'],
    });
    renderHome();
    expect(screen.getByText(/This has been waiting 21 days/i)).toBeInTheDocument();
  });

  it('5. hides secondary card row when both continueItem and quickWin are null', () => {
    const bookmark = makeBookmark();
    vi.mocked(useScoring).mockReturnValue({
      topPick: { bookmark, reason: 'A reason.' },
      continueItem: null,
      quickWin: null,
      ctx: {} as ReturnType<typeof useScoring>['ctx'],
    });
    renderHome();
    expect(screen.queryByText('Continue')).not.toBeInTheDocument();
    expect(screen.queryByText('Quick Win')).not.toBeInTheDocument();
  });

  it('6. shows Continue card when continueItem is non-null', () => {
    const continueBookmark = makeBookmark({
      id: 'b2',
      title: 'Continue Article',
      status: 'reading',
    });
    vi.mocked(useScoring).mockReturnValue({
      topPick: null,
      continueItem: continueBookmark,
      quickWin: null,
      ctx: {} as ReturnType<typeof useScoring>['ctx'],
    });
    renderHome();
    expect(screen.getByText('Continue')).toBeInTheDocument();
    expect(screen.getByText('Continue Article')).toBeInTheDocument();
  });

  it('7. shows Quick Win card when quickWin is non-null', () => {
    const quickBookmark = makeBookmark({ id: 'b3', title: 'Quick Win Article' });
    vi.mocked(useScoring).mockReturnValue({
      topPick: null,
      continueItem: null,
      quickWin: quickBookmark,
      ctx: {} as ReturnType<typeof useScoring>['ctx'],
    });
    renderHome();
    expect(screen.getByText('Quick Win')).toBeInTheDocument();
    expect(screen.getByText('Quick Win Article')).toBeInTheDocument();
  });

  it('8. clicking a mood pill activates it and deactivates others', async () => {
    const user = userEvent.setup();
    renderHome();
    const deepBtn = screen.getByRole('button', { name: /deep/i });
    const smartBtn = screen.getByRole('button', { name: /smart/i });
    expect(smartBtn).toHaveClass('bg-primary-600');
    await user.click(deepBtn);
    expect(deepBtn).toHaveClass('bg-primary-600');
    expect(smartBtn).not.toHaveClass('bg-primary-600');
  });

  it('9. clicking settings gear opens settings modal', async () => {
    const user = userEvent.setup();
    renderHome();
    expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /open settings/i }));
    expect(screen.getByTestId('settings-modal')).toBeInTheDocument();
  });

  it('10. shows onboarding modal when contentdeck_values is null', () => {
    localStorage.removeItem('contentdeck_values');
    renderHome();
    expect(screen.getByTestId('onboarding-modal')).toBeInTheDocument();
  });

  it('11. does not show onboarding modal when values exist in localStorage', () => {
    localStorage.setItem('contentdeck_values', JSON.stringify({ version: 1 }));
    renderHome();
    expect(screen.queryByTestId('onboarding-modal')).not.toBeInTheDocument();
  });

  it('12. Start reading calls cycleStatus.mutate with { id, newStatus: reading }', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('open', vi.fn());
    const bookmark = makeBookmark({ id: 'pick-1', status: 'unread' });
    vi.mocked(useScoring).mockReturnValue({
      topPick: { bookmark, reason: 'A good pick.' },
      continueItem: null,
      quickWin: null,
      ctx: {} as ReturnType<typeof useScoring>['ctx'],
    });
    renderHome();
    await user.click(screen.getByRole('button', { name: /start reading/i }));
    expect(mockCycleStatusMutate).toHaveBeenCalledWith({
      id: 'pick-1',
      newStatus: 'reading',
    });
  });

  it('13. Just Added strip shown when bookmarks has an unread item with different id than topPick', () => {
    const topBookmark = makeBookmark({ id: 'top-1', title: 'Top Pick' });
    const newestBookmark = makeBookmark({
      id: 'new-1',
      title: 'Freshly Saved Article',
      status: 'unread',
      created_at: new Date(Date.now() + 1000).toISOString(),
    });
    vi.mocked(useScoring).mockReturnValue({
      topPick: { bookmark: topBookmark, reason: 'A reason.' },
      continueItem: null,
      quickWin: null,
      ctx: {} as ReturnType<typeof useScoring>['ctx'],
    });
    vi.mocked(useBookmarks).mockReturnValue({
      bookmarks: [newestBookmark, topBookmark],
      isLoading: false,
      cycleStatus: {
        mutate: mockCycleStatusMutate,
        mutateAsync: vi.fn().mockResolvedValue(undefined),
      } as unknown as ReturnType<typeof useBookmarks>['cycleStatus'],
      addNote: {
        mutate: vi.fn(),
        mutateAsync: vi.fn().mockResolvedValue(undefined),
      } as unknown as ReturnType<typeof useBookmarks>['addNote'],
    } as unknown as ReturnType<typeof useBookmarks>);
    renderHome();
    expect(screen.getByText('🆕 Just added')).toBeInTheDocument();
    expect(screen.getByText('Freshly Saved Article')).toBeInTheDocument();
  });

  it('14. Just Added strip hidden when bookmarks array is empty', () => {
    renderHome();
    expect(screen.queryByText('🆕 Just added')).not.toBeInTheDocument();
  });

  it('15. Just Added strip hidden when most recent unread matches topPick id', () => {
    const bookmark = makeBookmark({ id: 'same-1', title: 'Same Bookmark' });
    vi.mocked(useScoring).mockReturnValue({
      topPick: { bookmark, reason: 'Top reason.' },
      continueItem: null,
      quickWin: null,
      ctx: {} as ReturnType<typeof useScoring>['ctx'],
    });
    vi.mocked(useBookmarks).mockReturnValue({
      bookmarks: [bookmark],
      isLoading: false,
      cycleStatus: {
        mutate: mockCycleStatusMutate,
        mutateAsync: vi.fn().mockResolvedValue(undefined),
      } as unknown as ReturnType<typeof useBookmarks>['cycleStatus'],
      addNote: {
        mutate: vi.fn(),
        mutateAsync: vi.fn().mockResolvedValue(undefined),
      } as unknown as ReturnType<typeof useBookmarks>['addNote'],
    } as unknown as ReturnType<typeof useBookmarks>);
    renderHome();
    expect(screen.queryByText('🆕 Just added')).not.toBeInTheDocument();
  });

  it('16. Continue card renders Mark done button when continueItem is non-null', () => {
    const continueBookmark = makeBookmark({
      id: 'c-1',
      title: 'In Progress Article',
      status: 'reading',
    });
    vi.mocked(useScoring).mockReturnValue({
      topPick: null,
      continueItem: continueBookmark,
      quickWin: null,
      ctx: {} as ReturnType<typeof useScoring>['ctx'],
    });
    renderHome();
    expect(screen.getByRole('button', { name: /mark done/i })).toBeInTheDocument();
  });

  it('17. clicking Go back in reflection modal closes it without calling cycleStatus', async () => {
    const user = userEvent.setup();
    const continueBookmark = makeBookmark({
      id: 'c-3',
      title: 'Cancel Test',
      status: 'reading',
    });
    vi.mocked(useScoring).mockReturnValue({
      topPick: null,
      continueItem: continueBookmark,
      quickWin: null,
      ctx: {} as ReturnType<typeof useScoring>['ctx'],
    });
    renderHome();
    await user.click(screen.getByRole('button', { name: /mark done/i }));
    expect(screen.getByTestId('reflection-modal')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /go back/i }));
    expect(screen.queryByTestId('reflection-modal')).not.toBeInTheDocument();
    expect(mockCycleStatusMutate).not.toHaveBeenCalled();
  });

  it('18. Review card shown when reviewItem is non-null', () => {
    const reviewBookmark = makeBookmark({
      id: 'r-1',
      title: 'Review Article',
      status: 'done',
      notes: [{ type: 'reflection', content: 'My insight', created_at: '2026-01-01T00:00:00Z' }],
      last_reviewed_at: null,
    });
    vi.mocked(useSpacedReview).mockReturnValue({ reviewItem: reviewBookmark });
    renderHome();
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  it('19. clicking Review card opens review modal', async () => {
    const user = userEvent.setup();
    const reviewBookmark = makeBookmark({
      id: 'r-2',
      title: 'Review Article',
      status: 'done',
      notes: [{ type: 'reflection', content: 'My insight', created_at: '2026-01-01T00:00:00Z' }],
      last_reviewed_at: null,
    });
    vi.mocked(useSpacedReview).mockReturnValue({ reviewItem: reviewBookmark });
    renderHome();
    expect(screen.queryByTestId('review-modal')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /review:/i }));
    expect(screen.getByTestId('review-modal')).toBeInTheDocument();
  });

  it('20. clicking Mark done opens reflection modal', async () => {
    const user = userEvent.setup();
    const continueBookmark = makeBookmark({
      id: 'c-2',
      title: 'Article To Finish',
      status: 'reading',
    });
    vi.mocked(useScoring).mockReturnValue({
      topPick: null,
      continueItem: continueBookmark,
      quickWin: null,
      ctx: {} as ReturnType<typeof useScoring>['ctx'],
    });
    renderHome();
    expect(screen.queryByTestId('reflection-modal')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /mark done/i }));
    expect(screen.getByTestId('reflection-modal')).toBeInTheDocument();
  });
});
