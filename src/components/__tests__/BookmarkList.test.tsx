import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BookmarkList from '../feed/BookmarkList';
import type { Bookmark } from '../../types';

// --- UIProvider mock (mutable so tests can control state) ---
let mockSearchQuery = '';
let mockCurrentSource = 'all';
let mockCurrentStatus = 'all';
let mockCurrentTag = '';
let mockShowFavorites = false;
let mockCurrentSort = 'newest';
let mockSelectMode = false;
let mockSelectedIds = new Set<string>();

vi.mock('../../context/UIProvider', () => ({
  useUI: () => ({
    searchQuery: mockSearchQuery,
    setSearch: vi.fn(),
    currentSource: mockCurrentSource,
    currentStatus: mockCurrentStatus,
    currentTag: mockCurrentTag,
    showFavorites: mockShowFavorites,
    currentSort: mockCurrentSort,
    selectMode: mockSelectMode,
    selectedIds: mockSelectedIds,
    toggleSelected: vi.fn(),
  }),
}));

// Avoid favicon network calls
vi.mock('../../lib/utils', async () => {
  const actual = await vi.importActual('../../lib/utils');
  return { ...(actual as object), getFaviconUrl: () => 'https://favicon.test/icon.png' };
});

// --- Helpers ---
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

const defaultCallbacks = {
  onCycleStatus: vi.fn(),
  onToggleFavorite: vi.fn(),
  onDelete: vi.fn(),
  onClick: vi.fn(),
};

function renderList(bookmarks: Bookmark[]) {
  return render(<BookmarkList bookmarks={bookmarks} isLoading={false} {...defaultCallbacks} />);
}

// --- Tests ---
describe('BookmarkList — full-text search', () => {
  beforeEach(() => {
    mockSearchQuery = '';
    mockCurrentSource = 'all';
    mockCurrentStatus = 'all';
    mockCurrentTag = '';
    mockShowFavorites = false;
    mockCurrentSort = 'newest';
    mockSelectMode = false;
    mockSelectedIds = new Set();
  });

  it('shows all bookmarks when search is empty', () => {
    const bookmarks = [
      makeBookmark({ id: 'b1', title: 'React Hooks Guide' }),
      makeBookmark({ id: 'b2', title: 'Vim Motions' }),
    ];
    renderList(bookmarks);
    expect(screen.getByText('React Hooks Guide')).toBeInTheDocument();
    expect(screen.getByText('Vim Motions')).toBeInTheDocument();
  });

  it('filters by title', () => {
    mockSearchQuery = 'hooks';
    const bookmarks = [
      makeBookmark({ id: 'b1', title: 'React Hooks Guide' }),
      makeBookmark({ id: 'b2', title: 'Vim Motions' }),
    ];
    renderList(bookmarks);
    expect(screen.getByText('React Hooks Guide')).toBeInTheDocument();
    expect(screen.queryByText('Vim Motions')).not.toBeInTheDocument();
  });

  it('filters by excerpt content', () => {
    mockSearchQuery = 'deployment frequency';
    const bookmarks = [
      makeBookmark({
        id: 'b1',
        title: 'Measuring Productivity',
        excerpt: 'DORA metrics including deployment frequency and cycle time.',
      }),
      makeBookmark({ id: 'b2', title: 'Unrelated Article', excerpt: null }),
    ];
    renderList(bookmarks);
    expect(screen.getByText('Measuring Productivity')).toBeInTheDocument();
    expect(screen.queryByText('Unrelated Article')).not.toBeInTheDocument();
  });

  it('filters by extracted content body (content.text)', () => {
    mockSearchQuery = 'modular monolith';
    const bookmarks = [
      makeBookmark({
        id: 'b1',
        title: 'Architecture Patterns',
        content: {
          text: 'A modular monolith keeps strong module boundaries without service overhead.',
        },
      }),
      makeBookmark({ id: 'b2', title: 'Another Post', content: {} }),
    ];
    renderList(bookmarks);
    expect(screen.getByText('Architecture Patterns')).toBeInTheDocument();
    expect(screen.queryByText('Another Post')).not.toBeInTheDocument();
  });

  it('search is case-insensitive', () => {
    mockSearchQuery = 'TYPESCRIPT';
    const bookmarks = [
      makeBookmark({ id: 'b1', title: 'TypeScript Deep Dive' }),
      makeBookmark({ id: 'b2', title: 'JavaScript Basics' }),
    ];
    renderList(bookmarks);
    expect(screen.getByText('TypeScript Deep Dive')).toBeInTheDocument();
    expect(screen.queryByText('JavaScript Basics')).not.toBeInTheDocument();
  });

  it('filters by tags', () => {
    mockSearchQuery = 'react';
    const bookmarks = [
      makeBookmark({ id: 'b1', title: 'Component Patterns', tags: ['react', 'frontend'] }),
      makeBookmark({ id: 'b2', title: 'Database Design', tags: ['postgres'] }),
    ];
    renderList(bookmarks);
    expect(screen.getByText('Component Patterns')).toBeInTheDocument();
    expect(screen.queryByText('Database Design')).not.toBeInTheDocument();
  });

  it('shows no-matches empty state when nothing matches search', () => {
    mockSearchQuery = 'zzznomatch';
    const bookmarks = [makeBookmark({ id: 'b1', title: 'React Hooks Guide' })];
    renderList(bookmarks);
    expect(screen.getByText('No matches')).toBeInTheDocument();
  });

  it('shows result count when search is active', () => {
    mockSearchQuery = 'react';
    const bookmarks = [
      makeBookmark({ id: 'b1', title: 'React Hooks Guide', tags: ['react'] }),
      makeBookmark({ id: 'b2', title: 'React Query', tags: ['react'] }),
      makeBookmark({ id: 'b3', title: 'Vim Motions', tags: [] }),
    ];
    renderList(bookmarks);
    expect(screen.getByText('2 results for "react"')).toBeInTheDocument();
  });

  it('shows singular "1 result" when exactly one bookmark matches', () => {
    mockSearchQuery = 'hooks';
    const bookmarks = [
      makeBookmark({ id: 'b1', title: 'React Hooks Guide' }),
      makeBookmark({ id: 'b2', title: 'Database Design' }),
    ];
    renderList(bookmarks);
    expect(screen.getByText('1 result for "hooks"')).toBeInTheDocument();
  });

  it('does not show result count when search is empty', () => {
    mockSearchQuery = '';
    const bookmarks = [makeBookmark({ id: 'b1', title: 'React Hooks Guide' })];
    renderList(bookmarks);
    expect(screen.queryByText(/result/i)).not.toBeInTheDocument();
  });

  it('handles bookmark with no content field gracefully', () => {
    mockSearchQuery = 'something';
    const bookmarks = [makeBookmark({ id: 'b1', title: 'Article', content: {} })];
    // Should not throw
    expect(() => renderList(bookmarks)).not.toThrow();
  });
});
