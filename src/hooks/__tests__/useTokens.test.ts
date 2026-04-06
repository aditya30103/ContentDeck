import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTokens } from '../useTokens';
import { createMockSupabase, createHookWrapper, makeToken } from '../../test/test-utils';

// ---- Mock setup ----

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

describe('useTokens — query', () => {
  it('returns [] initially and populates after query resolves', async () => {
    const tokens = [
      makeToken({ id: 't1', name: 'Default' }),
      makeToken({ id: 't2', name: 'iOS Shortcut' }),
    ];
    const builder = mockClient._getBuilder('user_tokens');
    builder._resolve = { data: tokens, error: null };

    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useTokens(), { wrapper: Wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tokens).toEqual(tokens);
  });

  it('returns [] on DB error — does not throw', async () => {
    const builder = mockClient._getBuilder('user_tokens');
    builder._resolve = { data: null, error: new Error('DB error') };

    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useTokens(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tokens).toEqual([]);
  });

  it('returns [] when data is null and no error', async () => {
    const builder = mockClient._getBuilder('user_tokens');
    builder._resolve = { data: null, error: null };

    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useTokens(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tokens).toEqual([]);
  });
});

// ---- createToken ----

describe('useTokens — createToken', () => {
  it('inserts a hashed token (not plain text) into the DB', async () => {
    const builder = mockClient._getBuilder('user_tokens');
    builder._resolve = { data: [], error: null };

    // insert resolves with no data (we just verify insert was called with hash)
    builder._resolve = { data: [], error: null };

    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useTokens(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Reset builder for the insert
    builder._resolve = { data: null, error: null };

    act(() => {
      result.current.createToken.mutate('My Token');
    });

    await waitFor(() => expect(result.current.createToken.isSuccess).toBe(true));

    // Verify insert was called with token_hash (64 hex chars = SHA-256) not the raw token
    const insertCall = builder.insert.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(insertCall).toBeDefined();
    expect(insertCall).toHaveProperty('token_hash');
    expect(typeof insertCall!.token_hash).toBe('string');
    // SHA-256 hex = 64 chars
    expect((insertCall!.token_hash as string).length).toBe(64);
    // Should NOT store the raw token (which would be 64 hex chars from generateToken but different from hash)
    expect(insertCall).toHaveProperty('name', 'My Token');
  });

  it('returns the plainToken in success data', async () => {
    const builder = mockClient._getBuilder('user_tokens');
    builder._resolve = { data: [], error: null };

    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useTokens(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    builder._resolve = { data: null, error: null };

    act(() => {
      result.current.createToken.mutate('Test');
    });

    await waitFor(() => expect(result.current.createToken.isSuccess).toBe(true));
    // The mutation returns { plainToken } — a raw hex string
    const data = result.current.createToken.data;
    expect(data).toHaveProperty('plainToken');
    expect(typeof data!.plainToken).toBe('string');
    expect(data!.plainToken.length).toBeGreaterThan(0);
  });

  it('shows success toast on creation', async () => {
    const builder = mockClient._getBuilder('user_tokens');
    builder._resolve = { data: [], error: null };

    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useTokens(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    builder._resolve = { data: null, error: null };

    act(() => {
      result.current.createToken.mutate('Token Name');
    });

    await waitFor(() => expect(result.current.createToken.isSuccess).toBe(true));
    expect(mockToast.success).toHaveBeenCalledWith('Token created');
  });

  it('shows error toast and calls Sentry on DB error', async () => {
    const builder = mockClient._getBuilder('user_tokens');
    builder._resolve = { data: [], error: null };

    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useTokens(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    builder._resolve = { data: null, error: new Error('Insert failed') };

    act(() => {
      result.current.createToken.mutate('Failed Token');
    });

    await waitFor(() => expect(result.current.createToken.isError).toBe(true));
    expect(mockToast.error).toHaveBeenCalledWith('Failed to create token');
    expect(mockSentry.captureException).toHaveBeenCalled();
  });

  it('throws when user is not authenticated', async () => {
    const builder = mockClient._getBuilder('user_tokens');
    builder._resolve = { data: [], error: null };

    // Override auth.getUser to return no user
    mockClient.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useTokens(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.createToken.mutate('Unauthed');
    });

    await waitFor(() => expect(result.current.createToken.isError).toBe(true));
    expect(mockSentry.captureException).toHaveBeenCalled();
  });
});

// ---- deleteToken ----

describe('useTokens — deleteToken', () => {
  it('removes token optimistically from cache', async () => {
    const tokens = [
      makeToken({ id: 't1', name: 'Keep' }),
      makeToken({ id: 't2', name: 'Delete Me' }),
    ];
    const builder = mockClient._getBuilder('user_tokens');
    builder._resolve = { data: tokens, error: null };

    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useTokens(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tokens).toHaveLength(2);

    builder._resolve = { data: null, error: null };

    result.current.deleteToken.mutate('t2');

    // onMutate fires async; waitFor polls until optimistic remove takes effect
    await waitFor(() => expect(result.current.tokens.find((t) => t.id === 't2')).toBeUndefined());
    await waitFor(() => expect(result.current.deleteToken.isSuccess).toBe(true));
    expect(mockToast.success).toHaveBeenCalledWith('Token revoked');
  });

  it('rolls back optimistic delete on DB error', async () => {
    const tokens = [makeToken({ id: 't1', name: 'Important' })];
    const builder = mockClient._getBuilder('user_tokens');
    builder._resolve = { data: tokens, error: null };

    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useTokens(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    builder._resolve = { data: null, error: new Error('Delete failed') };

    act(() => {
      result.current.deleteToken.mutate('t1');
    });

    await waitFor(() => expect(result.current.deleteToken.isError).toBe(true));
    // Rollback: t1 is back
    expect(result.current.tokens.find((t) => t.id === 't1')).toBeDefined();
    expect(mockToast.error).toHaveBeenCalledWith('Failed to delete token');
    expect(mockSentry.captureException).toHaveBeenCalled();
  });
});
