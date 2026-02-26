import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookmarkCard from '../feed/BookmarkCard';
import type { Bookmark } from '../../types';

// Mock UIProvider
const mockSetTag = vi.fn();
vi.mock('../../context/UIProvider', () => ({
  useUI: () => ({ setTag: mockSetTag }),
}));

// Mock favicon to avoid network calls
vi.mock('../../lib/utils', async () => {
  const actual = await vi.importActual('../../lib/utils');
  return {
    ...(actual as object),
    getFaviconUrl: () => 'https://favicon.test/icon.png',
  };
});

function makeBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: 'b1',
    url: 'https://example.com/article',
    title: 'Test Article',
    image: null,
    excerpt: null,
    source_type: 'blog',
    status: 'unread',
    is_favorited: false,
    notes: [],
    tags: ['react', 'testing'],
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

const defaultCallbacks = {
  onCycleStatus: vi.fn(),
  onToggleFavorite: vi.fn(),
  onDelete: vi.fn(),
  onClick: vi.fn(),
};

describe('BookmarkCard', () => {
  it('renders title, domain, and source badge', () => {
    render(<BookmarkCard bookmark={makeBookmark()} {...defaultCallbacks} />);
    expect(screen.getByText('Test Article')).toBeInTheDocument();
    expect(screen.getByText('example.com')).toBeInTheDocument();
    expect(screen.getByText('Blog')).toBeInTheDocument();
  });

  it('renders status badge and cycles on click', async () => {
    const user = userEvent.setup();
    const onCycleStatus = vi.fn();
    render(
      <BookmarkCard
        bookmark={makeBookmark({ status: 'unread' })}
        {...defaultCallbacks}
        onCycleStatus={onCycleStatus}
      />,
    );
    const statusBtn = screen.getByLabelText(/Status: Unread/);
    await user.click(statusBtn);
    expect(onCycleStatus).toHaveBeenCalledWith('b1', 'reading');
  });

  it('toggles favorite on heart click', async () => {
    const user = userEvent.setup();
    const onToggleFavorite = vi.fn();
    render(
      <BookmarkCard
        bookmark={makeBookmark({ is_favorited: false })}
        {...defaultCallbacks}
        onToggleFavorite={onToggleFavorite}
      />,
    );
    await user.click(screen.getByLabelText('Add to favorites'));
    expect(onToggleFavorite).toHaveBeenCalledWith('b1', true);
  });

  it('shows confirm dialog on delete and calls onDelete', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<BookmarkCard bookmark={makeBookmark()} {...defaultCallbacks} onDelete={onDelete} />);
    await user.click(screen.getByLabelText('Delete bookmark'));
    expect(window.confirm).toHaveBeenCalledWith('Delete this bookmark?');
    expect(onDelete).toHaveBeenCalledWith('b1');
  });

  it('does not delete when confirm is cancelled', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<BookmarkCard bookmark={makeBookmark()} {...defaultCallbacks} onDelete={onDelete} />);
    await user.click(screen.getByLabelText('Delete bookmark'));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('renders tags and shows overflow count', () => {
    render(
      <BookmarkCard
        bookmark={makeBookmark({ tags: ['a', 'b', 'c', 'd', 'e'] })}
        {...defaultCallbacks}
      />,
    );
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('b')).toBeInTheDocument();
    expect(screen.getByText('c')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('renders area pills with emoji', () => {
    render(
      <BookmarkCard
        bookmark={makeBookmark({
          areas: [
            {
              id: 'a1',
              name: 'Dev',
              emoji: '🔧',
              color: '#6366f1',
              description: null,
              sort_order: 0,
              created_at: '',
            },
          ],
        })}
        {...defaultCallbacks}
      />,
    );
    expect(screen.getByText(/Dev/)).toBeInTheDocument();
    expect(screen.getByText(/🔧/)).toBeInTheDocument();
  });

  it('calls onClick when card body is clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<BookmarkCard bookmark={makeBookmark()} {...defaultCallbacks} onClick={onClick} />);
    await user.click(screen.getByText('Test Article'));
    expect(onClick).toHaveBeenCalledWith('b1');
  });
});
