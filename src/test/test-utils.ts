/**
 * Shared test utilities for ContentDeck test suite.
 * Provides canonical factories and mock helpers used across all test files.
 */

import { createElement } from 'react';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Bookmark, TagArea, UserToken, StatusHistoryEntry, Note } from '../types';

// ---- Data Factories ----

export function makeBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: 'bm-1',
    url: 'https://example.com/article',
    title: 'Test Article',
    image: null,
    excerpt: 'A short excerpt.',
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
    created_at: '2024-01-15T12:00:00Z',
    status_changed_at: '2024-01-15T12:00:00Z',
    started_reading_at: null,
    finished_at: null,
    last_reviewed_at: null,
    ...overrides,
  };
}

export function makeRawBookmark(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'bm-1',
    url: 'https://example.com/article',
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
    created_at: '2024-01-15T12:00:00Z',
    status_changed_at: '2024-01-15T12:00:00Z',
    started_reading_at: null,
    finished_at: null,
    last_reviewed_at: null,
    bookmark_tags: [],
    ...overrides,
  };
}

export function makeTagArea(overrides: Partial<TagArea> = {}): TagArea {
  return {
    id: 'area-1',
    name: 'Technology',
    description: null,
    color: '#6366f1',
    emoji: '💻',
    sort_order: 0,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    type: 'note',
    content: 'A test note.',
    created_at: '2024-01-15T12:00:00Z',
    ...overrides,
  };
}

export function makeToken(overrides: Partial<UserToken> = {}): UserToken {
  return {
    id: 'token-1',
    name: 'Default',
    created_at: '2024-01-01T00:00:00Z',
    last_used_at: null,
    ...overrides,
  };
}

export function makeStatusHistoryEntry(
  overrides: Partial<StatusHistoryEntry> = {},
): StatusHistoryEntry {
  return {
    id: 'hist-1',
    bookmark_id: 'bm-1',
    old_status: 'reading',
    new_status: 'done',
    changed_at: '2024-01-15T12:00:00Z',
    ...overrides,
  };
}

// ---- Mock Supabase Builder ----

export interface MockBuilder {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  _resolve: { data: unknown; error: unknown };
}

export interface MockSupabaseClient {
  from: ReturnType<typeof vi.fn>;
  auth: {
    getUser: ReturnType<typeof vi.fn>;
  };
  functions: {
    invoke: ReturnType<typeof vi.fn>;
  };
  _getBuilder: (table: string) => MockBuilder;
  _resetBuilders: () => void;
}

export function createMockBuilder(): MockBuilder {
  const builder = {
    _resolve: { data: null as unknown, error: null as unknown },
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    gte: vi.fn(),
    order: vi.fn(),
    single: vi.fn(),
  } satisfies MockBuilder;

  for (const key of [
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'in',
    'gte',
    'order',
    'single',
  ]) {
    (builder[key as keyof typeof builder] as ReturnType<typeof vi.fn>).mockReturnValue(builder);
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

export function createMockSupabase(): MockSupabaseClient {
  const builders = new Map<string, MockBuilder>();

  const client: MockSupabaseClient = {
    from: vi.fn((table: string) => {
      if (!builders.has(table)) builders.set(table, createMockBuilder());
      return builders.get(table)!;
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    _getBuilder: (table: string) => {
      if (!builders.has(table)) builders.set(table, createMockBuilder());
      return builders.get(table)!;
    },
    _resetBuilders: () => builders.clear(),
  };

  return client;
}

// ---- Hook Test Wrapper ----

/** Creates a fresh QueryClient + Wrapper component for each test. */
export function createHookWrapper(mockClient?: MockSupabaseClient) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  // Suppress "act()" warnings in tests
  queryClient.setDefaultOptions({ queries: { retry: false } });

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  return { Wrapper, queryClient, mockClient };
}
