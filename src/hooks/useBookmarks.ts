import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import { useSupabase } from '../context/SupabaseProvider';
import { useToast } from '../components/ui/Toast';
import { fetchMetadata } from '../lib/metadata';
import { suggestTags } from '../lib/ai';
import { exportToObsidianUri } from '../lib/obsidian';
import { detectSourceType, isBookWithoutUrl } from '../lib/utils';
import type { Bookmark, TagArea, Status, NoteType, Note, BookmarkMetadata } from '../types';

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

/** Raw bookmark row from Supabase with nested join data */
interface RawBookmarkRow extends Omit<Bookmark, 'areas'> {
  bookmark_tags?: Array<{ tag_area_id: string; tag_areas: TagArea }>;
  areas?: TagArea[];
}

/** Normalize bookmark data from Supabase — ensures arrays/objects are never null */
function normalizeBookmark(b: RawBookmarkRow): Bookmark {
  // Flatten nested bookmark_tags join into areas array
  const areas: TagArea[] =
    b.bookmark_tags?.map((bt) => bt.tag_areas).filter(Boolean) ?? b.areas ?? [];
  return {
    ...b,
    tags: b.tags ?? [],
    areas,
    notes: b.notes ?? [],
    metadata: b.metadata ?? {},
    content: b.content ?? {},
    content_status: b.content_status ?? 'pending',
    content_fetched_at: b.content_fetched_at ?? null,
    is_favorited: b.is_favorited ?? false,
    synced: b.synced ?? false,
    last_reviewed_at: b.last_reviewed_at ?? null,
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
        .select('*, bookmark_tags(tag_area_id, tag_areas(*))')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return ((data ?? []) as RawBookmarkRow[]).map(normalizeBookmark);
    },
  });

  const addBookmark = useMutation({
    mutationFn: async (bookmark: {
      url?: string;
      title?: string;
      source_type?: string;
      tags?: string[];
      notes?: Bookmark['notes'];
      metadata?: BookmarkMetadata;
    }) => {
      const url = bookmark.url || 'book://no-url';
      const sourceType =
        bookmark.source_type || (url.startsWith('http') ? detectSourceType(url) : 'book');
      const { data, error } = (await db
        .from('bookmarks')
        .insert({
          url,
          title: bookmark.title || null,
          source_type: sourceType,
          tags: bookmark.tags || [],
          notes: bookmark.notes || [],
          status: 'unread',
          is_favorited: false,
          metadata: bookmark.metadata || {},
          synced: false,
        })
        .select()
        .single()) as { data: RawBookmarkRow; error: Error | null };
      if (error) throw error;
      return normalizeBookmark(data);
    },
    onSuccess: (newBookmark) => {
      queryClient.setQueryData<Bookmark[]>(QUERY_KEY, (old) =>
        old ? [newBookmark, ...old] : [newBookmark],
      );
      toast.success('Bookmark added');
      // Fetch metadata first (awaited), THEN trigger extraction.
      // Extraction's invalidateQueries must not race with the metadata DB write.
      void autoFetchMetadataAndTag(newBookmark)
        .then(() => {
          void triggerExtraction(newBookmark);
        })
        .catch((err: unknown) => {
          Sentry.captureException(err);
        });
    },
    onError: (err) => {
      Sentry.captureException(err);
      toast.error('Failed to add bookmark');
    },
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
    onError: (err, _id, context) => {
      Sentry.captureException(err);
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
    onSuccess: (_data, { id, newStatus }) => {
      if (
        newStatus === 'done' &&
        localStorage.getItem('obsidian_vault') &&
        localStorage.getItem('obsidian_auto_export') === 'true'
      ) {
        const vaultName = localStorage.getItem('obsidian_vault')!;
        const vaultFolder = localStorage.getItem('obsidian_vault_folder') ?? 'ContentDeck';
        const updatedBookmark = queryClient
          .getQueryData<Bookmark[]>(QUERY_KEY)
          ?.find((b) => b.id === id);
        if (updatedBookmark) {
          exportToObsidianUri(updatedBookmark, vaultName, vaultFolder);
          markSynced.mutate(id);
        }
      }
    },
    onError: (err, _vars, context) => {
      Sentry.captureException(err);
      if (context?.prev) queryClient.setQueryData(QUERY_KEY, context.prev);
      toast.error('Update failed');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const updateBookmark = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Bookmark> & { id: string }) => {
      // Strip `areas` from updates — managed via junction table, not bookmark row
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { areas: _areas, ...dbUpdates } = updates;
      const { data, error } = (await db
        .from('bookmarks')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single()) as { data: RawBookmarkRow; error: Error | null };
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
    onError: (err, _vars, context) => {
      Sentry.captureException(err);
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
    onError: (err, _vars, context) => {
      Sentry.captureException(err);
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
    onError: (err, _ids, context) => {
      Sentry.captureException(err);
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
    onError: (err, _vars, context) => {
      Sentry.captureException(err);
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
    onError: (err, _vars, context) => {
      Sentry.captureException(err);
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
    onError: (err, _id, context) => {
      Sentry.captureException(err);
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
    onError: (err, _vars, context) => {
      Sentry.captureException(err);
      if (context?.prev) queryClient.setQueryData(QUERY_KEY, context.prev);
      toast.error('Update failed');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  /** Assign an area to a bookmark via junction table */
  async function assignArea(bookmarkId: string, area: TagArea) {
    const { error } = await db
      .from('bookmark_tags')
      .insert({ bookmark_id: bookmarkId, tag_area_id: area.id });
    if (error) throw error;
    // Update cache
    queryClient.setQueryData<Bookmark[]>(QUERY_KEY, (old) =>
      old?.map((b) =>
        b.id === bookmarkId
          ? { ...b, areas: [...b.areas.filter((a) => a.id !== area.id), area] }
          : b,
      ),
    );
  }

  /** Remove an area from a bookmark */
  async function removeArea(bookmarkId: string, areaId: string) {
    const { error } = await db
      .from('bookmark_tags')
      .delete()
      .eq('bookmark_id', bookmarkId)
      .eq('tag_area_id', areaId);
    if (error) throw error;
    queryClient.setQueryData<Bookmark[]>(QUERY_KEY, (old) =>
      old?.map((b) =>
        b.id === bookmarkId ? { ...b, areas: b.areas.filter((a) => a.id !== areaId) } : b,
      ),
    );
  }

  /** Replace all area assignments for a bookmark */
  async function setAreas(bookmarkId: string, areas: TagArea[]) {
    // Delete existing junction rows
    const { error: delError } = await db
      .from('bookmark_tags')
      .delete()
      .eq('bookmark_id', bookmarkId);
    if (delError) throw delError;
    // Insert new ones
    if (areas.length > 0) {
      const rows = areas.map((a) => ({ bookmark_id: bookmarkId, tag_area_id: a.id }));
      const { error: insError } = await db.from('bookmark_tags').insert(rows);
      if (insError) throw insError;
    }
    queryClient.setQueryData<Bookmark[]>(QUERY_KEY, (old) =>
      old?.map((b) => (b.id === bookmarkId ? { ...b, areas } : b)),
    );
  }

  /** Fetch metadata then AI-tag — used on add so AI has title context */
  async function autoFetchMetadataAndTag(bookmark: Bookmark) {
    // Skip metadata fetch for URL-less books — no URL to scrape
    if (isBookWithoutUrl(bookmark)) {
      if (bookmark.tags.length === 0 && bookmark.title && localStorage.getItem('openrouter_key')) {
        void autoSuggestTags(bookmark);
      }
      return;
    }

    let enriched = bookmark;
    try {
      const result = await fetchMetadata(bookmark.url, bookmark.source_type);
      const updates = buildMetadataUpdates(bookmark, result);
      if (updates) {
        const { error } = await db.from('bookmarks').update(updates).eq('id', bookmark.id);
        if (!error) {
          // Merge updates into the CURRENT cache state for this bookmark so we
          // don't clobber fields (e.g. areas) that were set after the initial insert.
          queryClient.setQueryData<Bookmark[]>(QUERY_KEY, (old) =>
            old?.map((b) => (b.id === bookmark.id ? { ...b, ...updates } : b)),
          );
          enriched = {
            ...(queryClient
              .getQueryData<Bookmark[]>(QUERY_KEY)
              ?.find((b) => b.id === bookmark.id) ?? bookmark),
          };
        }
      }
      // For arXiv, populate content.text with the abstract regardless of whether
      // other metadata fields needed updating — abstract should always be stored.
      if (bookmark.source_type === 'arxiv' && result.metadata?.abstract) {
        const text = result.metadata.abstract;
        void db
          .from('bookmarks')
          .update({
            content: {
              text,
              method: 'arxiv_api',
              word_count: text.split(/\s+/).filter(Boolean).length,
              extracted_at: new Date().toISOString(),
            },
            content_status: 'success',
            content_fetched_at: new Date().toISOString(),
          })
          .eq('id', bookmark.id);
      }
    } catch (err) {
      // Silent fail for metadata — still attempt tagging with whatever we have
      if (import.meta.env.DEV) console.warn('[autoFetchMetadata] failed', err);
    }
    if (enriched.tags.length === 0 && localStorage.getItem('openrouter_key')) {
      void autoSuggestTags(enriched);
    }
  }

  /** Refresh metadata for any bookmark — force re-fetches even if fields exist, then re-tags */
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
    const enriched = { ...bookmark, ...updates } as Bookmark;
    queryClient.setQueryData<Bookmark[]>(QUERY_KEY, (old) =>
      old?.map((b) => (b.id === bookmark.id ? enriched : b)),
    );
    // Re-extract content
    void triggerExtraction(bookmark);
    // Re-tag with AI using refreshed metadata
    if (localStorage.getItem('openrouter_key')) {
      void autoSuggestTags(enriched);
    }
  }

  const isDemo = localStorage.getItem('contentdeck_demo') === 'true';
  const SKIP_EXTRACTION_SOURCES = ['twitter', 'book', 'arxiv'];

  async function triggerExtraction(bookmark: Bookmark) {
    if (isDemo) return;
    if (SKIP_EXTRACTION_SOURCES.includes(bookmark.source_type)) return;
    try {
      await db.functions.invoke('extract-content', {
        body: { bookmark_id: bookmark.id },
      });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    } catch (err) {
      // Silent fail — extraction is non-critical
      if (import.meta.env.DEV) console.warn('[triggerExtraction] failed', err);
    }
  }

  async function autoSuggestTags(bookmark: Bookmark, allAreas?: TagArea[]) {
    const areas = allAreas ?? queryClient.getQueryData<TagArea[]>(['tagAreas']) ?? [];
    try {
      const allTags = (queryClient.getQueryData<Bookmark[]>(QUERY_KEY) ?? [])
        .flatMap((b) => b.tags)
        .filter((t, i, arr) => arr.indexOf(t) === i);
      const result = await suggestTags(bookmark, allTags, areas);
      const { tags, areas: matchedAreaNames, suggestedArea } = result;

      // Assign matched areas via junction table
      if (matchedAreaNames && matchedAreaNames.length > 0) {
        for (const areaName of matchedAreaNames) {
          const area = areas.find((a) => a.name.toLowerCase() === areaName.toLowerCase());
          if (area) {
            try {
              await assignArea(bookmark.id, area);
            } catch {
              // Ignore duplicate assignment errors
            }
          }
        }
      }

      // Suggest new area via toast (don't auto-create)
      if (suggestedArea) {
        toast.info(`AI suggests creating area: "${suggestedArea}"`);
      }

      if (tags.length === 0) return;

      const merged = [...new Set([...bookmark.tags, ...tags])];
      const { error } = await db.from('bookmarks').update({ tags: merged }).eq('id', bookmark.id);
      if (!error) {
        queryClient.setQueryData<Bookmark[]>(QUERY_KEY, (old) =>
          old?.map((b) => (b.id === bookmark.id ? { ...b, tags: merged } : b)),
        );
        toast.info(`AI suggested tags: ${tags.join(', ')}`);
      }
    } catch (err) {
      // Silent fail for AI tagging — non-critical
      if (import.meta.env.DEV) console.warn('[autoSuggestTags] failed', err);
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
    assignArea,
    removeArea,
    setAreas,
    autoSuggestTags,
  };
}

// Re-export for convenience
export { STATUS_NEXT } from '../types';
