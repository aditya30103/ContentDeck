import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '../context/SupabaseProvider';
import { useToast } from '../components/ui/Toast';
import { fetchMetadata } from '../lib/metadata';
import { suggestTags } from '../lib/ai';
import { detectSourceType } from '../lib/utils';
import type { Bookmark, Status, NoteType, Note, BookmarkMetadata } from '../types';

const QUERY_KEY = ['bookmarks'] as const;

interface MetadataResult {
  title?: string;
  image?: string;
  excerpt?: string;
  metadata?: BookmarkMetadata;
}

/** Build DB update object from metadata result — only fills empty fields */
function buildMetadataUpdates(
  bookmark: Bookmark,
  result: MetadataResult,
): Record<string, unknown> | null {
  const updates: Record<string, unknown> = {};
  if (result.title && !bookmark.title) updates.title = result.title;
  if (result.image && !bookmark.image) updates.image = result.image;
  if (result.excerpt && !bookmark.excerpt) updates.excerpt = result.excerpt;
  if (result.metadata) {
    updates.metadata = { ...bookmark.metadata, ...result.metadata };
  }
  return Object.keys(updates).length > 0 ? updates : null;
}

/** Normalize bookmark data from Supabase — ensures arrays/objects are never null */
function normalizeBookmark(b: Bookmark): Bookmark {
  return {
    ...b,
    tags: b.tags ?? [],
    notes: b.notes ?? [],
    metadata: b.metadata ?? {},
    content: b.content ?? {},
    content_status: b.content_status ?? 'pending',
    content_fetched_at: b.content_fetched_at ?? null,
    is_favorited: b.is_favorited ?? false,
    synced: b.synced ?? false,
  };
}

export function useBookmarks() {
  const db = useSupabase();
  const queryClient = useQueryClient();
  const toast = useToast();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await db
        .from('bookmarks')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return ((data ?? []) as Bookmark[]).map(normalizeBookmark);
    },
  });

  const addBookmark = useMutation({
    mutationFn: async (bookmark: {
      url: string;
      title?: string;
      source_type?: string;
      tags?: string[];
      notes?: Bookmark['notes'];
    }) => {
      const { data, error } = (await db
        .from('bookmarks')
        .insert({
          url: bookmark.url,
          title: bookmark.title || null,
          source_type: bookmark.source_type || detectSourceType(bookmark.url),
          tags: bookmark.tags || [],
          notes: bookmark.notes || [],
          status: 'unread',
          is_favorited: false,
          metadata: {},
          synced: false,
        })
        .select()
        .single()) as { data: Bookmark; error: Error | null };
      if (error) throw error;
      return normalizeBookmark(data);
    },
    onSuccess: (newBookmark) => {
      queryClient.setQueryData<Bookmark[]>(QUERY_KEY, (old) =>
        old ? [newBookmark, ...old] : [newBookmark],
      );
      toast.success('Bookmark added');
      // Auto-fetch metadata in background
      void autoFetchMetadata(newBookmark);
      // Auto-extract content in background
      void triggerExtraction(newBookmark);
      // Auto-suggest tags via AI if no tags provided and API key exists
      if (newBookmark.tags.length === 0 && localStorage.getItem('openrouter_key')) {
        void autoSuggestTags(newBookmark);
      }
    },
    onError: () => toast.error('Failed to add bookmark'),
  });

  const deleteBookmark = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('bookmarks').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const prev = queryClient.getQueryData<Bookmark[]>(QUERY_KEY);
      queryClient.setQueryData<Bookmark[]>(QUERY_KEY, (old) => old?.filter((b) => b.id !== id));
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) queryClient.setQueryData(QUERY_KEY, context.prev);
      toast.error('Failed to delete');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const cycleStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: Status }) => {
      const { error } = await db.from('bookmarks').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const prev = queryClient.getQueryData<Bookmark[]>(QUERY_KEY);
      queryClient.setQueryData<Bookmark[]>(QUERY_KEY, (old) =>
        old?.map((b) => (b.id === id ? { ...b, status: newStatus } : b)),
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(QUERY_KEY, context.prev);
      toast.error('Update failed');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const updateBookmark = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Bookmark> & { id: string }) => {
      const { data, error } = (await db
        .from('bookmarks')
        .update(updates)
        .eq('id', id)
        .select()
        .single()) as { data: Bookmark; error: Error | null };
      if (error) throw error;
      return normalizeBookmark(data);
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const prev = queryClient.getQueryData<Bookmark[]>(QUERY_KEY);
      queryClient.setQueryData<Bookmark[]>(QUERY_KEY, (old) =>
        old?.map((b) => (b.id === id ? { ...b, ...updates } : b)),
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(QUERY_KEY, context.prev);
      toast.error('Update failed');
    },
    onSuccess: () => toast.success('Bookmark updated'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const bulkUpdateStatus = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: Status }) => {
      const { error } = await db.from('bookmarks').update({ status }).in('id', ids);
      if (error) throw error;
    },
    onMutate: async ({ ids, status }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const prev = queryClient.getQueryData<Bookmark[]>(QUERY_KEY);
      queryClient.setQueryData<Bookmark[]>(QUERY_KEY, (old) =>
        old?.map((b) => (ids.includes(b.id) ? { ...b, status } : b)),
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(QUERY_KEY, context.prev);
      toast.error('Bulk update failed');
    },
    onSuccess: (_data, vars) => toast.success(`${vars.ids.length} bookmarks updated`),
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await db.from('bookmarks').delete().in('id', ids);
      if (error) throw error;
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const prev = queryClient.getQueryData<Bookmark[]>(QUERY_KEY);
      queryClient.setQueryData<Bookmark[]>(QUERY_KEY, (old) =>
        old?.filter((b) => !ids.includes(b.id)),
      );
      return { prev };
    },
    onError: (_err, _ids, context) => {
      if (context?.prev) queryClient.setQueryData(QUERY_KEY, context.prev);
      toast.error('Bulk delete failed');
    },
    onSuccess: (_data, ids) => toast.success(`${ids.length} bookmarks deleted`),
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const addNote = useMutation({
    mutationFn: async ({
      bookmarkId,
      type,
      content,
    }: {
      bookmarkId: string;
      type: NoteType;
      content: string;
    }) => {
      // Fetch current notes from DB (not cache, which onMutate already modified)
      const { data: row, error: fetchErr } = await db
        .from('bookmarks')
        .select('notes')
        .eq('id', bookmarkId)
        .single();
      if (fetchErr) throw fetchErr;
      const currentNotes = (row as { notes: Note[] | null }).notes ?? [];
      const newNote = { type, content, created_at: new Date().toISOString() };
      const updatedNotes = [...currentNotes, newNote];
      const { error } = await db
        .from('bookmarks')
        .update({ notes: updatedNotes })
        .eq('id', bookmarkId);
      if (error) throw error;
    },
    onMutate: async ({ bookmarkId, type, content }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const prev = queryClient.getQueryData<Bookmark[]>(QUERY_KEY);
      const newNote = { type, content, created_at: new Date().toISOString() };
      queryClient.setQueryData<Bookmark[]>(QUERY_KEY, (old) =>
        old?.map((b) => (b.id === bookmarkId ? { ...b, notes: [...b.notes, newNote] } : b)),
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(QUERY_KEY, context.prev);
      toast.error('Failed to add note');
    },
    onSuccess: () => toast.success('Note added'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const deleteNote = useMutation({
    mutationFn: async ({ bookmarkId, noteIndex }: { bookmarkId: string; noteIndex: number }) => {
      // Fetch current notes from DB (not cache, which onMutate already modified)
      const { data: row, error: fetchErr } = await db
        .from('bookmarks')
        .select('notes')
        .eq('id', bookmarkId)
        .single();
      if (fetchErr) throw fetchErr;
      const currentNotes = (row as { notes: Note[] | null }).notes ?? [];
      const updatedNotes = currentNotes.filter((_, i) => i !== noteIndex);
      const { error } = await db
        .from('bookmarks')
        .update({ notes: updatedNotes })
        .eq('id', bookmarkId);
      if (error) throw error;
    },
    onMutate: async ({ bookmarkId, noteIndex }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const prev = queryClient.getQueryData<Bookmark[]>(QUERY_KEY);
      queryClient.setQueryData<Bookmark[]>(QUERY_KEY, (old) =>
        old?.map((b) =>
          b.id === bookmarkId ? { ...b, notes: b.notes.filter((_, i) => i !== noteIndex) } : b,
        ),
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(QUERY_KEY, context.prev);
      toast.error('Failed to delete note');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const markSynced = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('bookmarks').update({ synced: true }).eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const prev = queryClient.getQueryData<Bookmark[]>(QUERY_KEY);
      queryClient.setQueryData<Bookmark[]>(QUERY_KEY, (old) =>
        old?.map((b) => (b.id === id ? { ...b, synced: true } : b)),
      );
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) queryClient.setQueryData(QUERY_KEY, context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const toggleFavorite = useMutation({
    mutationFn: async ({ id, is_favorited }: { id: string; is_favorited: boolean }) => {
      const { error } = await db.from('bookmarks').update({ is_favorited }).eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, is_favorited }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const prev = queryClient.getQueryData<Bookmark[]>(QUERY_KEY);
      queryClient.setQueryData<Bookmark[]>(QUERY_KEY, (old) =>
        old?.map((b) => (b.id === id ? { ...b, is_favorited } : b)),
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(QUERY_KEY, context.prev);
      toast.error('Update failed');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  async function autoFetchMetadata(bookmark: Bookmark) {
    try {
      const result = await fetchMetadata(bookmark.url, bookmark.source_type);
      const updates = buildMetadataUpdates(bookmark, result);
      if (!updates) return;

      const { error } = await db.from('bookmarks').update(updates).eq('id', bookmark.id);
      if (!error) {
        queryClient.setQueryData<Bookmark[]>(QUERY_KEY, (old) =>
          old?.map((b) => (b.id === bookmark.id ? { ...b, ...updates } : b)),
        );
      }
    } catch {
      // Silent fail for metadata — non-critical
    }
  }

  /** Refresh metadata for any bookmark — force re-fetches even if fields exist */
  async function refreshMetadata(bookmark: Bookmark) {
    const result = await fetchMetadata(bookmark.url, bookmark.source_type);
    const updates: Record<string, unknown> = {};
    if (result.title) updates.title = result.title;
    if (result.image) updates.image = result.image;
    if (result.excerpt) updates.excerpt = result.excerpt;
    if (result.metadata) {
      updates.metadata = { ...bookmark.metadata, ...result.metadata };
    }
    if (Object.keys(updates).length === 0) {
      throw new Error('No metadata found');
    }

    const { error } = await db.from('bookmarks').update(updates).eq('id', bookmark.id);
    if (error) throw error;
    queryClient.setQueryData<Bookmark[]>(QUERY_KEY, (old) =>
      old?.map((b) => (b.id === bookmark.id ? { ...b, ...updates } : b)),
    );
    // Also re-extract content
    void triggerExtraction(bookmark);
  }

  const isDemo = localStorage.getItem('contentdeck_demo') === 'true';
  const SKIP_EXTRACTION_SOURCES = ['youtube', 'twitter'];

  async function triggerExtraction(bookmark: Bookmark) {
    if (isDemo) return;
    if (SKIP_EXTRACTION_SOURCES.includes(bookmark.source_type)) return;
    try {
      await db.functions.invoke('extract-content', {
        body: { bookmark_id: bookmark.id },
      });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    } catch {
      // Silent fail — extraction is non-critical
    }
  }

  async function autoSuggestTags(bookmark: Bookmark) {
    try {
      const allTags = (queryClient.getQueryData<Bookmark[]>(QUERY_KEY) ?? [])
        .flatMap((b) => b.tags)
        .filter((t, i, arr) => arr.indexOf(t) === i);
      const { tags } = await suggestTags(bookmark, allTags);
      if (tags.length === 0) return;

      const merged = [...new Set([...bookmark.tags, ...tags])];
      const { error } = await db.from('bookmarks').update({ tags: merged }).eq('id', bookmark.id);
      if (!error) {
        queryClient.setQueryData<Bookmark[]>(QUERY_KEY, (old) =>
          old?.map((b) => (b.id === bookmark.id ? { ...b, tags: merged } : b)),
        );
        toast.info(`AI suggested tags: ${tags.join(', ')}`);
      }
    } catch {
      // Silent fail for AI tagging — non-critical
    }
  }

  return {
    bookmarks: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    addBookmark,
    updateBookmark,
    deleteBookmark,
    bulkUpdateStatus,
    bulkDelete,
    cycleStatus,
    toggleFavorite,
    addNote,
    deleteNote,
    markSynced,
    refreshMetadata,
  };
}

// Re-export for convenience
export { STATUS_NEXT } from '../types';
