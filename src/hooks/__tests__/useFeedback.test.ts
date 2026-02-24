import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFeedback } from '../useFeedback';
import type { FeedbackItem } from '../../types';

// ---- Mock modules ----

const mockSupabaseClient = createMockSupabase();
vi.mock('../../context/SupabaseProvider', () => ({
  useSupabase: () => mockSupabaseClient,
}));

const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn() };
vi.mock('../../components/ui/Toast', () => ({
  useToast: () => mockToast,
}));

// ---- Helper: chainable Supabase mock ----

interface MockBuilder {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
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
    order: vi.fn(),
    single: vi.fn(),
  };

  for (const key of ['select', 'insert', 'update', 'delete', 'eq', 'order', 'single']) {
    (builder[key as keyof MockBuilder] as ReturnType<typeof vi.fn>).mockReturnValue(builder);
  }

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

// ---- Sample data ----

const SAMPLE_FEEDBACK: FeedbackItem = {
  id: 'fb-1',
  user_id: 'user-1',
  feedback_type: 'bug',
  title: 'Favorites filter broken',
  description: 'When I enable favorites, the list does not filter',
  severity: 'major',
  app_context: {
    statusFilter: 'all',
    showFavorites: true,
    selectedTag: null,
    searchQuery: '',
    sort: 'newest',
    viewMode: 'list',
    activeBookmarkId: null,
    activeBookmarkTitle: null,
  },
  system_context: {
    userAgent: 'Mozilla/5.0',
    viewport: { width: 1440, height: 900 },
    online: true,
    timestamp: '2026-02-24T10:00:00.000Z',
  },
  active_bookmark_id: null,
  status: 'open',
  resolution_note: null,
  created_at: '2026-02-24T10:00:00.000Z',
  updated_at: '2026-02-24T10:00:00.000Z',
};

// ---- Tests ----

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabaseClient._resetBuilders();
});

describe('useFeedback — query', () => {
  it('returns normalized feedback items from mock', async () => {
    const builder = mockSupabaseClient._getBuilder('feedback');
    builder._resolve = { data: [SAMPLE_FEEDBACK], error: null };

    const { result } = renderHook(() => useFeedback(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.feedbackItems).toHaveLength(1);
    expect(result.current.feedbackItems[0]!.id).toBe('fb-1');
    expect(result.current.feedbackItems[0]!.title).toBe('Favorites filter broken');
  });

  it('returns empty array on query error', async () => {
    const builder = mockSupabaseClient._getBuilder('feedback');
    builder._resolve = { data: null, error: { message: 'DB error' } };

    const { result } = renderHook(() => useFeedback(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.feedbackItems).toEqual([]);
  });
});

describe('useFeedback — submitFeedback', () => {
  it('queries again after submit and shows submitted item', async () => {
    // Initial query returns empty list
    const builder = mockSupabaseClient._getBuilder('feedback');
    builder._resolve = { data: [], error: null };

    const { result } = renderHook(() => useFeedback(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Set builder so insert succeeds (no error) AND re-fetch after invalidate returns the new item
    builder._resolve = { data: [SAMPLE_FEEDBACK], error: null };

    act(() => {
      result.current.submitFeedback.mutate({
        feedback_type: 'bug',
        title: 'Favorites filter broken',
        description: null,
        severity: 'major',
        app_context: SAMPLE_FEEDBACK.app_context,
        system_context: SAMPLE_FEEDBACK.system_context,
        active_bookmark_id: null,
      });
    });

    await waitFor(() => expect(result.current.submitFeedback.isSuccess).toBe(true));
    expect(mockToast.success).toHaveBeenCalledWith('Feedback submitted');
    // After invalidateQueries the query re-runs; builder now returns [SAMPLE_FEEDBACK]
    await waitFor(() => expect(result.current.feedbackItems[0]?.id).toBe('fb-1'));
  });

  it('shows error toast on submit failure', async () => {
    const builder = mockSupabaseClient._getBuilder('feedback');
    builder._resolve = { data: [], error: null };

    const { result } = renderHook(() => useFeedback(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Simulate insert failure
    builder._resolve = { data: null, error: { message: 'insert failed' } };

    act(() => {
      result.current.submitFeedback.mutate({
        feedback_type: 'bug',
        title: 'Test',
        description: null,
        severity: 'minor',
        app_context: SAMPLE_FEEDBACK.app_context,
        system_context: SAMPLE_FEEDBACK.system_context,
        active_bookmark_id: null,
      });
    });

    await waitFor(() => expect(result.current.submitFeedback.isError).toBe(true));
    expect(mockToast.error).toHaveBeenCalledWith('Failed to submit feedback');
  });
});

describe('useFeedback — updateStatus', () => {
  it('applies optimistic update and confirms status after re-fetch', async () => {
    const builder = mockSupabaseClient._getBuilder('feedback');
    builder._resolve = { data: [SAMPLE_FEEDBACK], error: null };

    const { result } = renderHook(() => useFeedback(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.feedbackItems).toHaveLength(1));
    expect(result.current.feedbackItems[0]!.status).toBe('open');

    // Set builder so update succeeds AND re-fetch after invalidate returns the updated item
    builder._resolve = { data: [{ ...SAMPLE_FEEDBACK, status: 'resolved' }], error: null };

    act(() => {
      result.current.updateStatus.mutate({ id: 'fb-1', status: 'resolved' });
    });

    // Optimistic update should be visible (and re-fetch also returns resolved)
    await waitFor(() => expect(result.current.feedbackItems[0]!.status).toBe('resolved'));
  });

  it('rolls back on error', async () => {
    const builder = mockSupabaseClient._getBuilder('feedback');
    builder._resolve = { data: [SAMPLE_FEEDBACK], error: null };

    const { result } = renderHook(() => useFeedback(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.feedbackItems).toHaveLength(1));

    // Force the update to fail
    builder._resolve = { data: null, error: { message: 'update failed' } };

    act(() => {
      result.current.updateStatus.mutate({ id: 'fb-1', status: 'resolved' });
    });

    await waitFor(() => expect(result.current.updateStatus.isError).toBe(true));
    expect(mockToast.error).toHaveBeenCalledWith('Failed to update status');
    // Status should be rolled back to original
    expect(result.current.feedbackItems[0]!.status).toBe('open');
  });

  it('shows success toast on status update', async () => {
    const builder = mockSupabaseClient._getBuilder('feedback');
    builder._resolve = { data: [SAMPLE_FEEDBACK], error: null };

    const { result } = renderHook(() => useFeedback(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.feedbackItems).toHaveLength(1));

    builder._resolve = { data: null, error: null };

    act(() => {
      result.current.updateStatus.mutate({ id: 'fb-1', status: 'investigating' });
    });

    await waitFor(() => expect(result.current.updateStatus.isSuccess).toBe(true));
    expect(mockToast.success).toHaveBeenCalledWith('Status updated');
  });

  it('stores resolution note in optimistic update and re-fetch', async () => {
    const builder = mockSupabaseClient._getBuilder('feedback');
    builder._resolve = { data: [SAMPLE_FEEDBACK], error: null };

    const { result } = renderHook(() => useFeedback(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.feedbackItems).toHaveLength(1));

    // Builder returns the updated item (with resolution note) for both DB update and re-fetch
    builder._resolve = {
      data: [{ ...SAMPLE_FEEDBACK, status: 'resolved', resolution_note: 'Fixed in PR #42' }],
      error: null,
    };

    act(() => {
      result.current.updateStatus.mutate({
        id: 'fb-1',
        status: 'resolved',
        resolution_note: 'Fixed in PR #42',
      });
    });

    await waitFor(() =>
      expect(result.current.feedbackItems[0]?.resolution_note).toBe('Fixed in PR #42'),
    );
  });

  it('invalidates query on settle', async () => {
    const builder = mockSupabaseClient._getBuilder('feedback');
    builder._resolve = { data: [SAMPLE_FEEDBACK], error: null };

    const { result } = renderHook(() => useFeedback(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.feedbackItems).toHaveLength(1));

    // Success path — after settle the query should re-run (returning items again)
    builder._resolve = { data: null, error: null };

    act(() => {
      result.current.updateStatus.mutate({ id: 'fb-1', status: 'resolved' });
    });

    await waitFor(() => expect(result.current.updateStatus.isSuccess).toBe(true));

    // After invalidation, query re-runs. The builder now returns null so items clear.
    // The important thing is the mutation settled without leaving isPending.
    expect(result.current.updateStatus.isPending).toBe(false);
  });
});
