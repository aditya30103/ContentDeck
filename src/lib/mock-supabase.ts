/**
 * Mock Supabase client for demo mode.
 * Implements the chainable query builder pattern so hooks work transparently.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DEMO_BOOKMARKS,
  DEMO_TAG_AREAS,
  DEMO_STATUS_HISTORY,
  DEMO_BOOKMARK_TAGS,
} from './demo-data';
import type {
  Bookmark,
  TagArea,
  StatusHistoryEntry,
  BookmarkTag,
  UserToken,
  FeedbackItem,
} from '../types';

type TableName =
  | 'bookmarks'
  | 'tag_areas'
  | 'status_history'
  | 'bookmark_tags'
  | 'user_tokens'
  | 'feedback';
type Row = Bookmark | TagArea | StatusHistoryEntry | BookmarkTag | UserToken | FeedbackItem;

interface TableStore {
  bookmarks: Bookmark[];
  tag_areas: TagArea[];
  status_history: StatusHistoryEntry[];
  bookmark_tags: BookmarkTag[];
  user_tokens: UserToken[];
  feedback: FeedbackItem[];
}

let nextId = 1;

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

/**
 * Chainable query builder that mimics the Supabase PostgREST builder.
 * Supports: select, insert, update, delete, eq, in, gte, order, single, then.
 */
class MockQueryBuilder {
  private store: TableStore;
  private table: TableName;
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private filters: Array<(row: Row) => boolean> = [];
  private orderCol: string | null = null;
  private orderAsc = true;
  private returnSingle = false;
  private insertPayload: Record<string, unknown> | Record<string, unknown>[] | null = null;
  private updatePayload: Record<string, unknown> | null = null;
  private shouldReturnData = false;
  private selectColumns: string = '*';

  constructor(store: TableStore, table: TableName) {
    this.store = store;
    this.table = table;
  }

  select(columns?: string) {
    this.op = 'select';
    this.shouldReturnData = true;
    this.selectColumns = columns ?? '*';
    return this;
  }

  insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
    this.op = 'insert';
    this.insertPayload = payload;
    return this;
  }

  update(payload: Record<string, unknown>) {
    this.op = 'update';
    this.updatePayload = payload;
    return this;
  }

  delete() {
    this.op = 'delete';
    return this;
  }

  eq(col: string, val: unknown) {
    this.filters.push((row) => (row as unknown as Record<string, unknown>)[col] === val);
    return this;
  }

  in(col: string, vals: unknown[]) {
    this.filters.push((row) => vals.includes((row as unknown as Record<string, unknown>)[col]));
    return this;
  }

  gte(col: string, val: unknown) {
    this.filters.push((row) => {
      const v = (row as unknown as Record<string, unknown>)[col];
      if (typeof v === 'string' && typeof val === 'string') return v >= val;
      if (typeof v === 'number' && typeof val === 'number') return v >= val;
      return false;
    });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderCol = col;
    this.orderAsc = opts?.ascending ?? true;
    return this;
  }

  single() {
    this.returnSingle = true;
    return this;
  }

  /** Attach bookmark_tags join data to bookmark rows */
  private attachBookmarkTags(rows: Row[]): Row[] {
    if (this.table !== 'bookmarks') return rows;
    if (!this.selectColumns.includes('bookmark_tags')) return rows;

    return rows.map((row) => {
      const bm = row as Bookmark;
      const junctionRows = this.store.bookmark_tags.filter((bt) => bt.bookmark_id === bm.id);
      const bookmark_tags = junctionRows.map((bt) => {
        const tagArea = this.store.tag_areas.find((ta) => ta.id === bt.tag_area_id);
        return { tag_area_id: bt.tag_area_id, tag_areas: tagArea ?? null };
      });
      return { ...bm, bookmark_tags } as unknown as Row;
    });
  }

  private execute(): { data: unknown; error: null } {
    const arr = this.store[this.table] as Row[];

    if (this.op === 'select') {
      let rows = arr.filter((row) => this.filters.every((f) => f(row)));
      if (this.orderCol) {
        const col = this.orderCol;
        const asc = this.orderAsc;
        rows = [...rows].sort((a, b) => {
          const av = (a as unknown as Record<string, unknown>)[col];
          const bv = (b as unknown as Record<string, unknown>)[col];
          if (av == null && bv == null) return 0;
          if (av == null) return asc ? -1 : 1;
          if (bv == null) return asc ? 1 : -1;
          if (av < bv) return asc ? -1 : 1;
          if (av > bv) return asc ? 1 : -1;
          return 0;
        });
      }
      rows = this.attachBookmarkTags(rows);
      return {
        data: this.returnSingle ? (rows[0] ?? null) : deepClone(rows),
        error: null,
      };
    }

    if (this.op === 'insert') {
      const payloads = Array.isArray(this.insertPayload)
        ? this.insertPayload
        : [this.insertPayload!];
      const inserted: Row[] = [];

      for (const payload of payloads) {
        const newRow = {
          id: `demo-new-${nextId++}`,
          created_at: new Date().toISOString(),
          ...payload,
        } as Row;
        arr.push(newRow);
        inserted.push(newRow);

        // If inserting a bookmark, also add a status_history entry
        if (this.table === 'bookmarks') {
          const bm = newRow as Bookmark;
          this.store.status_history.push({
            id: `hist-new-${nextId++}`,
            bookmark_id: bm.id,
            old_status: null,
            new_status: bm.status || 'unread',
            changed_at: new Date().toISOString(),
          } as StatusHistoryEntry);
        }
      }

      if (this.shouldReturnData) {
        const last = inserted[inserted.length - 1]!;
        return {
          data: this.returnSingle ? deepClone(last) : deepClone(inserted),
          error: null,
        };
      }
      return { data: null, error: null };
    }

    if (this.op === 'update') {
      const updates = this.updatePayload!;
      let updated: Row | null = null;
      for (let i = 0; i < arr.length; i++) {
        if (this.filters.every((f) => f(arr[i]!))) {
          const old = arr[i]!;

          // Track status changes for bookmarks
          if (this.table === 'bookmarks' && 'status' in updates) {
            const bm = old as Bookmark;
            if (bm.status !== updates.status) {
              this.store.status_history.push({
                id: `hist-new-${nextId++}`,
                bookmark_id: bm.id,
                old_status: bm.status,
                new_status: updates.status as string,
                changed_at: new Date().toISOString(),
              } as StatusHistoryEntry);
            }
          }

          arr[i] = { ...old, ...updates } as Row;
          updated = arr[i]!;
        }
      }
      if (this.shouldReturnData) {
        return {
          data: this.returnSingle ? deepClone(updated) : deepClone(updated ? [updated] : []),
          error: null,
        };
      }
      return { data: null, error: null };
    }

    if (this.op === 'delete') {
      const before = arr.length;
      const filtered = arr.filter((row) => !this.filters.every((f) => f(row)));
      // Mutate in place
      arr.length = 0;
      arr.push(...filtered);
      return { data: { count: before - filtered.length }, error: null };
    }

    return { data: null, error: null };
  }

  // Make the builder thenable so `await db.from(...).select(...)` works
  then(
    resolve: (value: { data: unknown; error: null }) => void,
    reject?: (reason: unknown) => void,
  ) {
    try {
      resolve(this.execute());
    } catch (err) {
      if (reject) reject(err);
    }
  }
}

export function createMockSupabaseClient(): SupabaseClient {
  const store: TableStore = {
    bookmarks: deepClone(DEMO_BOOKMARKS),
    tag_areas: deepClone(DEMO_TAG_AREAS),
    status_history: deepClone(DEMO_STATUS_HISTORY),
    bookmark_tags: deepClone(DEMO_BOOKMARK_TAGS),
    user_tokens: [],
    feedback: [],
  };

  const mock = {
    from(table: string) {
      return new MockQueryBuilder(store, table as TableName);
    },
    functions: {
      invoke: () => Promise.resolve({ data: null, error: null }),
    },
    auth: {
      getUser: () =>
        Promise.resolve({
          data: { user: { id: 'demo-user', email: 'demo@example.com' } },
          error: null,
        }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  };

  return mock as unknown as SupabaseClient;
}
