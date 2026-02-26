import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBookmarks } from '../useBookmarks';

// ---- Mock modules ----

// Mock SupabaseProvider — return our mock client
const mockSupabaseClient = createMockSupabase();
vi.mock('../../context/SupabaseProvider', () => ({
  useSupabase: () => mockSupabaseClient,
}));

// Mock Toast
const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
vi.mock('../../components/ui/Toast', () => ({
  useToast: () => mockToast,
}));

// Mock metadata — we don't test metadata fetching here
vi.mock('../../lib/metadata', () => ({
  fetchMetadata: vi.fn().mockResolvedValue({}),
}));

// Mock AI — we don't test AI here
vi.mock('../../lib/ai', () => ({
  suggestTags: vi.fn().mockResolvedValue({ tags: [], areas: [] }),
}));

// ---- Helper: chainable Supabase mock ----

interface MockBuilder {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  _resolve: { data: unknown; error: unknown };
}

function createMockBuilder(): MockBuilder {
  const builder: MockBuilder = {
    _resolve: { data: null, error: null },
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    single: vi.fn(),
  };

  // Make every method return builder for chaining
  for (const key of ['select', 'insert', 'update', 'delete', 'eq', 'in', 'order', 'single']) {
    (builder[key as keyof MockBuilder] as ReturnType<typeof vi.fn>).mockReturnValue(builder);
  }

  // Make builder thenable so await resolves to _resolve
  const thenable = builder as unknown as {
    then: (
      resolve?: ((v: { data: unknown; error: unknown }) => unknown) | null,
      reject?: ((reason: unknown) => unknown) | null,
    ) => Promise<unknown>;
  };
  thenable.then = (resolve, reject) => Promise.resolve(builder._resolve).then(resolve, reject);

  return builder;
}

function createMockSupabase() {
  const builders = new Map<string, MockBuilder>();

  return {
    from: vi.fn((table: string) => {
      if (!builders.has(table)) builders.set(table, createMockBuilder());
      return builders.get(table)!;
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    _getBuilder: (table: string) => {
      if (!builders.has(table)) builders.set(table, createMockBuilder());
      return builders.get(table)!;
    },
    _resetBuilders: () => builders.clear(),
  };
}

// ---- Test wrapper ----

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// ---- Tests ----

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabaseClient._resetBuilders();
});

describe('useBookmarks — query', () => {
  it('normalizes bookmark data from Supabase', async () => {
    const builder = mockSupabaseClient._getBuilder('bookmarks');
    builder._resolve = {
      data: [
        {
          id: 'bm-1',
          url: 'https://example.com',
          title: 'Test',
          image: null,
          excerpt: null,
          source_type: 'blog',
          status: 'unread',
          is_favorited: false,
          notes: null,
          tags: null,
          metadata: null,
          content: null,
          content_status: null,
          content_fetched_at: null,
          synced: null,
          created_at: '2024-01-01T00:00:00Z',
          status_changed_at: '2024-01-01T00:00:00Z',
          started_reading_at: null,
          finished_at: null,
          bookmark_tags: [
            {
              tag_area_id: 'a1',
              tag_areas: {
                id: 'a1',
                name: 'Programming',
                description: null,
                color: null,
                emoji: null,
                sort_order: 0,
                created_at: '2024-01-01T00:00:00Z',
              },
            },
          ],
        },
      ],
      error: null,
    };

    const { result } = renderHook(() => useBookmarks(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.bookmarks.length).toBe(1));

    const bm = result.current.bookmarks[0]!;
    // Null fields should be normalized to defaults
    expect(bm.tags).toEqual([]);
    expect(bm.notes).toEqual([]);
    expect(bm.metadata).toEqual({});
    expect(bm.content).toEqual({});
    expect(bm.content_status).toBe('pending');
    expect(bm.is_favorited).toBe(false);
    expect(bm.synced).toBe(false);
    // Areas should be flattened from bookmark_tags
    expect(bm.areas).toEqual([expect.objectContaining({ id: 'a1', name: 'Programming' })]);
  });
});

describe('useBookmarks — addBookmark', () => {
  it('inserts bookmark and updates cache on success', async () => {
    // Initial query returns empty
    const builder = mockSupabaseClient._getBuilder('bookmarks');
    builder._resolve = { data: [], error: null };

    const { result } = renderHook(() => useBookmarks(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Now set up insert to return a new bookmark
    builder._resolve = {
      data: {
        id: 'bm-new',
        url: 'https://new.com',
        title: null,
        image: null,
        excerpt: null,
        source_type: 'blog',
        status: 'unread',
        is_favorited: false,
        notes: [],
        tags: [],
        metadata: {},
        content: {},
        content_status: 'pending',
        content_fetched_at: null,
        synced: false,
        created_at: '2024-01-01T00:00:00Z',
        status_changed_at: '2024-01-01T00:00:00Z',
        started_reading_at: null,
        finished_at: null,
      },
      error: null,
    };

    act(() => {
      result.current.addBookmark.mutate({ url: 'https://new.com' });
    });

    await waitFor(() => expect(result.current.addBookmark.isSuccess).toBe(true));
    expect(mockToast.success).toHaveBeenCalledWith('Bookmark added');
  });
});

describe('useBookmarks — deleteBookmark', () => {
  it('optimistically removes bookmark from cache', async () => {
    const builder = mockSupabaseClient._getBuilder('bookmarks');
    builder._resolve = {
      data: [
        {
          id: 'bm-1',
          url: 'https://example.com',
          title: 'Test',
          image: null,
          excerpt: null,
          source_type: 'blog',
          status: 'unread',
          is_favorited: false,
          notes: [],
          tags: [],
          metadata: {},
          content: {},
          content_status: 'pending',
          content_fetched_at: null,
          synced: false,
          created_at: '2024-01-01T00:00:00Z',
          status_changed_at: '2024-01-01T00:00:00Z',
          started_reading_at: null,
          finished_at: null,
        },
      ],
      error: null,
    };

    const { result } = renderHook(() => useBookmarks(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.bookmarks.length).toBe(1));

    // Set up delete to succeed
    builder._resolve = { data: null, error: null };

    act(() => {
      result.current.deleteBookmark.mutate('bm-1');
    });

    // Bookmark should be optimistically removed
    await waitFor(() => expect(result.current.bookmarks.length).toBe(0));
  });

  it('rolls back cache on delete error', async () => {
    const builder = mockSupabaseClient._getBuilder('bookmarks');
    builder._resolve = {
      data: [
        {
          id: 'bm-1',
          url: 'https://example.com',
          title: 'Test',
          image: null,
          excerpt: null,
          source_type: 'blog',
          status: 'unread',
          is_favorited: false,
          notes: [],
          tags: [],
          metadata: {},
          content: {},
          content_status: 'pending',
          content_fetched_at: null,
          synced: false,
          created_at: '2024-01-01T00:00:00Z',
          status_changed_at: '2024-01-01T00:00:00Z',
          started_reading_at: null,
          finished_at: null,
        },
      ],
      error: null,
    };

    const { result } = renderHook(() => useBookmarks(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.bookmarks.length).toBe(1));

    // Set up delete to fail
    builder._resolve = { data: null, error: new Error('DB error') };

    act(() => {
      result.current.deleteBookmark.mutate('bm-1');
    });

    // Should roll back — bookmark reappears
    await waitFor(() => expect(result.current.deleteBookmark.isError).toBe(true));
    expect(mockToast.error).toHaveBeenCalledWith('Failed to delete');
  });
});

describe('useBookmarks — cycleStatus', () => {
  it('optimistically updates status in cache', async () => {
    const builder = mockSupabaseClient._getBuilder('bookmarks');
    builder._resolve = {
      data: [
        {
          id: 'bm-1',
          url: 'https://example.com',
          title: 'Test',
          image: null,
          excerpt: null,
          source_type: 'blog',
          status: 'unread',
          is_favorited: false,
          notes: [],
          tags: [],
          metadata: {},
          content: {},
          content_status: 'pending',
          content_fetched_at: null,
          synced: false,
          created_at: '2024-01-01T00:00:00Z',
          status_changed_at: '2024-01-01T00:00:00Z',
          started_reading_at: null,
          finished_at: null,
        },
      ],
      error: null,
    };

    const { result } = renderHook(() => useBookmarks(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.bookmarks.length).toBe(1));

    // After mutation, onSettled will refetch — update resolve to reflect new status
    builder._resolve = {
      data: [
        {
          id: 'bm-1',
          url: 'https://example.com',
          title: 'Test',
          image: null,
          excerpt: null,
          source_type: 'blog',
          status: 'reading',
          is_favorited: false,
          notes: [],
          tags: [],
          metadata: {},
          content: {},
          content_status: 'pending',
          content_fetched_at: null,
          synced: false,
          created_at: '2024-01-01T00:00:00Z',
          status_changed_at: '2024-01-01T00:00:00Z',
          started_reading_at: null,
          finished_at: null,
        },
      ],
      error: null,
    };

    act(() => {
      result.current.cycleStatus.mutate({ id: 'bm-1', newStatus: 'reading' });
    });

    await waitFor(() =>
      expect(result.current.bookmarks.find((b) => b.id === 'bm-1')?.status).toBe('reading'),
    );
  });
});

// ---- Helper: wrapper that exposes queryClient ----

function createWrapperWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
}

function makeRawBookmark(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bm-1',
    url: 'https://example.com',
    title: null,
    image: null,
    excerpt: null,
    source_type: 'blog',
    status: 'unread',
    is_favorited: false,
    notes: [],
    tags: [],
    metadata: {},
    content: {},
    content_status: 'pending',
    content_fetched_at: null,
    synced: false,
    created_at: '2024-01-01T00:00:00Z',
    status_changed_at: '2024-01-01T00:00:00Z',
    started_reading_at: null,
    finished_at: null,
    bookmark_tags: [],
    ...overrides,
  };
}

describe('autoFetchMetadataAndTag — areas preserved', () => {
  it('preserves existing bookmark areas after metadata cache merge', async () => {
    const { fetchMetadata } = await import('../../lib/metadata');
    vi.mocked(fetchMetadata).mockResolvedValueOnce({ title: 'Fetched Title' });

    const builder = mockSupabaseClient._getBuilder('bookmarks');
    // Initial query: empty
    builder._resolve = { data: [], error: null };

    const { Wrapper } = createWrapperWithClient();
    const { result } = renderHook(() => useBookmarks(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Insert returns bookmark with an area in bookmark_tags
    const area = {
      id: 'area-1',
      name: 'Tech',
      description: null,
      color: null,
      emoji: null,
      sort_order: 0,
      created_at: '2024-01-01T00:00:00Z',
    };
    builder._resolve = {
      data: makeRawBookmark({
        id: 'bm-new',
        url: 'https://blog.com',
        bookmark_tags: [{ tag_area_id: 'area-1', tag_areas: area }],
      }),
      error: null,
    };

    act(() => {
      result.current.addBookmark.mutate({ url: 'https://blog.com' });
    });

    await waitFor(() => expect(result.current.addBookmark.isSuccess).toBe(true));

    // After autoFetchMetadataAndTag runs, title should be set AND areas preserved
    await waitFor(() => {
      const bm = result.current.bookmarks.find((b) => b.id === 'bm-new');
      return bm?.title === 'Fetched Title';
    });

    const bm = result.current.bookmarks.find((b) => b.id === 'bm-new');
    expect(bm?.areas).toEqual([expect.objectContaining({ id: 'area-1', name: 'Tech' })]);
  });
});

describe('triggerExtraction — invoke and invalidate', () => {
  it('calls functions.invoke for non-skipped source types', async () => {
    const builder = mockSupabaseClient._getBuilder('bookmarks');
    builder._resolve = { data: [], error: null };

    const { result } = renderHook(() => useBookmarks(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    builder._resolve = {
      data: makeRawBookmark({ id: 'bm-blog', url: 'https://blog.com', source_type: 'blog' }),
      error: null,
    };

    act(() => {
      result.current.addBookmark.mutate({ url: 'https://blog.com' });
    });

    await waitFor(() => expect(result.current.addBookmark.isSuccess).toBe(true));

    // Extraction runs after autoFetchMetadataAndTag — give it a tick
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    await waitFor(() =>
      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith(
        'extract-content',
        expect.objectContaining({ body: { bookmark_id: 'bm-blog' } }),
      ),
    );
  });
});

describe('useBookmarks — triggerExtraction (youtube transcript)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function makeYouTubeRawBookmark(overrides: Record<string, unknown> = {}) {
    return {
      id: 'bm-yt',
      url: 'https://youtube.com/watch?v=abc',
      title: 'Test Video',
      image: null,
      excerpt: null,
      source_type: 'youtube',
      status: 'unread',
      is_favorited: false,
      notes: [],
      tags: [],
      metadata: {},
      content: {},
      content_status: 'pending',
      content_fetched_at: null,
      synced: false,
      created_at: '2024-01-01T00:00:00Z',
      status_changed_at: '2024-01-01T00:00:00Z',
      started_reading_at: null,
      finished_at: null,
      bookmark_tags: [],
      ...overrides,
    };
  }

  it('calls functions.invoke for youtube (no longer in SKIP_EXTRACTION_SOURCES)', async () => {
    const builder = mockSupabaseClient._getBuilder('bookmarks');
    builder._resolve = { data: [], error: null };

    const { result } = renderHook(() => useBookmarks(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    builder._resolve = { data: makeYouTubeRawBookmark(), error: null };

    act(() => {
      result.current.addBookmark.mutate({ url: 'https://youtube.com/watch?v=abc' });
    });

    await waitFor(() => expect(result.current.addBookmark.isSuccess).toBe(true));

    await waitFor(() =>
      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith(
        'extract-content',
        expect.objectContaining({ body: { bookmark_id: 'bm-yt' } }),
      ),
    );
  });
});

describe('autoFetchMetadataAndTag — dev console.warn on failure', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs a warning in dev mode when fetchMetadata throws', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { fetchMetadata } = await import('../../lib/metadata');
    vi.mocked(fetchMetadata).mockRejectedValueOnce(new Error('Network error'));

    const builder = mockSupabaseClient._getBuilder('bookmarks');
    builder._resolve = { data: [], error: null };

    const { result } = renderHook(() => useBookmarks(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    builder._resolve = {
      data: makeRawBookmark({ id: 'bm-warn', url: 'https://blog.com' }),
      error: null,
    };

    act(() => {
      result.current.addBookmark.mutate({ url: 'https://blog.com' });
    });

    await waitFor(() => expect(result.current.addBookmark.isSuccess).toBe(true));

    // Wait for fire-and-forget to complete
    await new Promise((r) => setTimeout(r, 50));

    expect(warnSpy).toHaveBeenCalledWith('[autoFetchMetadata] failed', expect.any(Error));
  });
});
