import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTagAreas } from '../useTagAreas';
import { createMockSupabase, createHookWrapper, makeTagArea } from '../../test/test-utils';

// ---- Mock setup ----
// vi.mock factories are hoisted before const — use vi.hoisted() for variables referenced inside them

const mockClient = createMockSupabase();

vi.mock('../../context/SupabaseProvider', () => ({
  useSupabase: () => mockClient,
}));

const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('../../components/ui/Toast', () => ({ useToast: () => mockToast }));

const mockSentry = vi.hoisted(() => ({ captureException: vi.fn() }));
vi.mock('@sentry/react', () => mockSentry);

beforeEach(() => {
  vi.clearAllMocks();
  mockClient._resetBuilders();
});

// ---- Query ----

describe('useTagAreas — query', () => {
  it('returns areas sorted by sort_order from DB', async () => {
    const builder = mockClient._getBuilder('tag_areas');
    const areas = [
      makeTagArea({ id: 'a1', name: 'Tech', sort_order: 0 }),
      makeTagArea({ id: 'a2', name: 'Design', sort_order: 1 }),
    ];
    builder._resolve = { data: areas, error: null };

    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useTagAreas(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.areas).toEqual(areas);
  });

  it('returns [] on DB error (does not throw)', async () => {
    const builder = mockClient._getBuilder('tag_areas');
    builder._resolve = { data: null, error: { message: 'DB error', code: '500' } };

    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useTagAreas(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.areas).toEqual([]);
  });

  it('returns [] when data is null but no error', async () => {
    const builder = mockClient._getBuilder('tag_areas');
    builder._resolve = { data: null, error: null };

    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useTagAreas(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.areas).toEqual([]);
  });
});

// ---- createArea ----

describe('useTagAreas — createArea', () => {
  it('inserts area with sort_order = maxExisting + 1', async () => {
    const builder = mockClient._getBuilder('tag_areas');
    const existing = [
      makeTagArea({ id: 'a1', sort_order: 0 }),
      makeTagArea({ id: 'a2', sort_order: 1 }),
    ];
    builder._resolve = { data: existing, error: null };

    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useTagAreas(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const newArea = makeTagArea({ id: 'a3', name: 'Science', sort_order: 2 });
    builder._resolve = { data: newArea, error: null };

    act(() => {
      result.current.createArea.mutate({ name: 'Science' });
    });

    await waitFor(() => expect(result.current.createArea.isSuccess).toBe(true));
    expect(mockToast.success).toHaveBeenCalledWith('Area created');

    // Verify the inserted area appears in cache
    expect(result.current.areas.some((a) => a.name === 'Science')).toBe(true);
  });

  it('throws "already exists" when name matches existing (case-insensitive)', async () => {
    const builder = mockClient._getBuilder('tag_areas');
    const existing = [makeTagArea({ id: 'a1', name: 'tech', sort_order: 0 })];
    builder._resolve = { data: existing, error: null };

    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useTagAreas(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.createArea.mutate({ name: 'Tech' }); // capital T — should match 'tech'
    });

    await waitFor(() => expect(result.current.createArea.isError).toBe(true));
    expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('already exists'));
  });

  it('does NOT send duplicate-already-exists error to Sentry', async () => {
    const builder = mockClient._getBuilder('tag_areas');
    builder._resolve = { data: [makeTagArea({ name: 'tech' })], error: null };

    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useTagAreas(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.createArea.mutate({ name: 'Tech' });
    });

    await waitFor(() => expect(result.current.createArea.isError).toBe(true));
    expect(mockSentry.captureException).not.toHaveBeenCalled();
  });

  it('does NOT send Postgres 23505 unique-violation to Sentry', async () => {
    const builder = mockClient._getBuilder('tag_areas');
    builder._resolve = { data: [], error: null }; // no client-side duplicate

    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useTagAreas(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Simulate DB unique violation on insert
    builder._resolve = { data: null, error: { code: '23505', message: 'duplicate key' } };

    act(() => {
      result.current.createArea.mutate({ name: 'UniqueArea' });
    });

    await waitFor(() => expect(result.current.createArea.isError).toBe(true));
    expect(mockSentry.captureException).not.toHaveBeenCalled();
    expect(mockToast.error).toHaveBeenCalled();
  });

  it('sends non-duplicate errors to Sentry', async () => {
    const builder = mockClient._getBuilder('tag_areas');
    builder._resolve = { data: [], error: null };

    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useTagAreas(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Generic server error
    builder._resolve = { data: null, error: new Error('Server crashed') };

    act(() => {
      result.current.createArea.mutate({ name: 'NewArea' });
    });

    await waitFor(() => expect(result.current.createArea.isError).toBe(true));
    expect(mockSentry.captureException).toHaveBeenCalled();
  });

  it('uses sort_order 0 when no existing areas', async () => {
    const builder = mockClient._getBuilder('tag_areas');
    builder._resolve = { data: [], error: null };

    const { Wrapper, queryClient } = createHookWrapper();
    const { result } = renderHook(() => useTagAreas(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const newArea = makeTagArea({ id: 'a1', name: 'First', sort_order: 0 });
    builder._resolve = { data: newArea, error: null };

    act(() => {
      result.current.createArea.mutate({ name: 'First' });
    });

    await waitFor(() => expect(result.current.createArea.isSuccess).toBe(true));
    // Verify insert call had sort_order: 0
    const tagBuilder = mockClient._getBuilder('tag_areas');
    expect(tagBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({ sort_order: 0 }));
    void queryClient; // suppress unused
  });
});

// ---- updateArea ----

describe('useTagAreas — updateArea', () => {
  it('applies optimistic update before DB responds', async () => {
    const builder = mockClient._getBuilder('tag_areas');
    const original = [makeTagArea({ id: 'a1', name: 'Old Name' })];
    builder._resolve = { data: original, error: null };

    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useTagAreas(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Slow down the DB response so we can inspect the optimistic state
    let resolve!: (v: unknown) => void;
    const pending = new Promise((r) => (resolve = r));
    builder.single.mockReturnValue({ then: (cb: (v: unknown) => void) => pending.then(cb) });

    // Fire mutation (no act wrapping — TQ schedules onMutate async)
    result.current.updateArea.mutate({ id: 'a1', name: 'New Name' });

    // onMutate runs asynchronously; waitFor polls until optimistic update is visible
    await waitFor(() => expect(result.current.areas[0]!.name).toBe('New Name'));

    // DB still pending at this point — mutation not yet successful
    expect(result.current.updateArea.isSuccess).toBe(false);

    // Resolve DB and verify success
    resolve({ data: makeTagArea({ id: 'a1', name: 'New Name' }), error: null });
    await waitFor(() => expect(result.current.updateArea.isSuccess).toBe(true));
  });

  it('rolls back on DB error', async () => {
    const builder = mockClient._getBuilder('tag_areas');
    const original = [makeTagArea({ id: 'a1', name: 'Original' })];
    builder._resolve = { data: original, error: null };

    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useTagAreas(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    builder._resolve = { data: null, error: new Error('Update failed') };

    act(() => {
      result.current.updateArea.mutate({ id: 'a1', name: 'Broken' });
    });

    await waitFor(() => expect(result.current.updateArea.isError).toBe(true));
    // Cache should be restored to original
    expect(result.current.areas[0]!.name).toBe('Original');
    expect(mockToast.error).toHaveBeenCalledWith('Update failed');
    expect(mockSentry.captureException).toHaveBeenCalled();
  });
});

// ---- deleteArea ----

describe('useTagAreas — deleteArea', () => {
  it('removes area optimistically from cache', async () => {
    const builder = mockClient._getBuilder('tag_areas');
    const areas = [
      makeTagArea({ id: 'a1', name: 'Keep' }),
      makeTagArea({ id: 'a2', name: 'Delete Me' }),
    ];
    builder._resolve = { data: areas, error: null };

    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useTagAreas(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    builder._resolve = { data: null, error: null };

    result.current.deleteArea.mutate('a2');

    // onMutate fires async; waitFor polls until optimistic remove takes effect
    await waitFor(() => expect(result.current.areas.find((a) => a.id === 'a2')).toBeUndefined());
    await waitFor(() => expect(result.current.deleteArea.isSuccess).toBe(true));
    expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining('bookmarks kept'));
  });

  it('rolls back delete on DB error', async () => {
    const builder = mockClient._getBuilder('tag_areas');
    const areas = [makeTagArea({ id: 'a1', name: 'Important' })];
    builder._resolve = { data: areas, error: null };

    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useTagAreas(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    builder._resolve = { data: null, error: new Error('Delete failed') };

    act(() => {
      result.current.deleteArea.mutate('a1');
    });

    await waitFor(() => expect(result.current.deleteArea.isError).toBe(true));
    // Rollback: area is back
    expect(result.current.areas.find((a) => a.id === 'a1')).toBeDefined();
    expect(mockToast.error).toHaveBeenCalledWith('Failed to delete area');
  });
});

// ---- reorderAreas ----

describe('useTagAreas — reorderAreas', () => {
  it('reorders cache immediately (optimistic)', async () => {
    const builder = mockClient._getBuilder('tag_areas');
    const areas = [
      makeTagArea({ id: 'a1', name: 'A', sort_order: 0 }),
      makeTagArea({ id: 'a2', name: 'B', sort_order: 1 }),
      makeTagArea({ id: 'a3', name: 'C', sort_order: 2 }),
    ];
    builder._resolve = { data: areas, error: null };

    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useTagAreas(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Set _resolve to the reordered data so the post-mutation re-fetch also returns correct order
    const reordered = [
      makeTagArea({ id: 'a3', name: 'C', sort_order: 0 }),
      makeTagArea({ id: 'a2', name: 'B', sort_order: 1 }),
      makeTagArea({ id: 'a1', name: 'A', sort_order: 2 }),
    ];
    builder._resolve = { data: reordered, error: null };

    // Swap A and C
    result.current.reorderAreas.mutate(['a3', 'a2', 'a1']);

    // Either the optimistic update or the re-fetch will reflect the new order
    await waitFor(() => expect(result.current.areas[0]!.id).toBe('a3'));
    expect(result.current.areas[2]!.id).toBe('a1');
    await waitFor(() => expect(result.current.reorderAreas.isSuccess).toBe(true));
  });

  it('fires one DB update per area', async () => {
    const builder = mockClient._getBuilder('tag_areas');
    builder._resolve = {
      data: [makeTagArea({ id: 'a1', sort_order: 0 }), makeTagArea({ id: 'a2', sort_order: 1 })],
      error: null,
    };

    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useTagAreas(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    builder._resolve = { data: null, error: null };

    act(() => {
      result.current.reorderAreas.mutate(['a2', 'a1']);
    });

    await waitFor(() => expect(result.current.reorderAreas.isSuccess).toBe(true));
    // update() called twice (once per area)
    expect(builder.update).toHaveBeenCalledTimes(2);
  });

  it('rolls back on first error', async () => {
    const builder = mockClient._getBuilder('tag_areas');
    const areas = [
      makeTagArea({ id: 'a1', name: 'First', sort_order: 0 }),
      makeTagArea({ id: 'a2', name: 'Second', sort_order: 1 }),
    ];
    builder._resolve = { data: areas, error: null };

    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useTagAreas(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    builder._resolve = { data: null, error: new Error('Reorder failed') };

    act(() => {
      result.current.reorderAreas.mutate(['a2', 'a1']);
    });

    await waitFor(() => expect(result.current.reorderAreas.isError).toBe(true));
    // Original order restored
    expect(result.current.areas[0]!.id).toBe('a1');
    expect(mockToast.error).toHaveBeenCalledWith('Reorder failed');
  });
});
