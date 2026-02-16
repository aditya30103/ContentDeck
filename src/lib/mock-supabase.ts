/**
 * Mock Supabase client for demo mode.
 * Implements the chainable query builder pattern so hooks work transparently.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { DEMO_BOOKMARKS, DEMO_TAG_AREAS, DEMO_STATUS_HISTORY } from './demo-data';
import type { Bookmark, TagArea, StatusHistoryEntry } from '../types';

type TableName = 'bookmarks' | 'tag_areas' | 'status_history';
type Row = Bookmark | TagArea | StatusHistoryEntry;

interface TableStore {
  bookmarks: Bookmark[];
  tag_areas: TagArea[];
  status_history: StatusHistoryEntry[];
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
  private insertPayload: Record<string, unknown> | null = null;
  private updatePayload: Record<string, unknown> | null = null;
  private shouldReturnData = false;

  constructor(store: TableStore, table: TableName) {
    this.store = store;
    this.table = table;
  }

  select(_columns?: string) {
    this.op = 'select';
    this.shouldReturnData = true;
    return this;
  }

  insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
    this.op = 'insert';
    this.insertPayload = Array.isArray(payload) ? payload[0]! : payload;
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
      return {
        data: this.returnSingle ? (rows[0] ?? null) : deepClone(rows),
        error: null,
      };
    }

    if (this.op === 'insert') {
      const newRow = {
        id: `demo-new-${nextId++}`,
        created_at: new Date().toISOString(),
        ...this.insertPayload,
      } as Row;
      arr.push(newRow);

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

      if (this.shouldReturnData) {
        return { data: this.returnSingle ? deepClone(newRow) : deepClone([newRow]), error: null };
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
  };

  const mock = {
    from(table: string) {
      return new MockQueryBuilder(store, table as TableName);
    },
    functions: {
      invoke: () => Promise.resolve({ data: null, error: null }),
    },
  };

  return mock as unknown as SupabaseClient;
}
