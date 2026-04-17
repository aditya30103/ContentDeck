import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import AppShell from '../components/layout/AppShell';
import SourceTabs from '../components/feed/SourceTabs';
import FeedToolbar from '../components/feed/FeedToolbar';
import BookmarkList from '../components/feed/BookmarkList';
import AreasView from '../components/areas/AreasView';
import AreaManager from '../components/areas/AreaManager';
import DetailPanel from '../components/detail/DetailPanel';
import AddBookmarkModal from '../components/modals/AddBookmarkModal';
import EditBookmarkModal from '../components/modals/EditBookmarkModal';
import FeedbackModal from '../components/modals/FeedbackModal';
import SettingsModal from '../components/modals/SettingsModal';
import StatsModal from '../components/modals/StatsModal';
import BulkActionBar from '../components/modals/BulkActionBar';
import { useBookmarks } from '../hooks/useBookmarks';
import { useTagAreas } from '../hooks/useTagAreas';
import { useStats } from '../hooks/useStats';
import { useUI } from '../context/UIProvider';
import { useSupabase } from '../context/SupabaseProvider';
import { useToast } from '../components/ui/Toast';
import ProgressBar from '../components/ui/ProgressBar';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { exportToObsidianUri, exportToClipboard } from '../lib/obsidian';
import { fetchMetadata } from '../lib/metadata';
import type { Bookmark, Status, NoteType, TagArea } from '../types';

interface DashboardProps {
  userEmail: string | null;
  onSignOut: () => void;
  isDemo?: boolean;
  sharedUrl?: string | null;
}

export default function Dashboard({ userEmail, onSignOut, isDemo, sharedUrl }: DashboardProps) {
  const {
    bookmarks,
    isLoading,
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
    retryExtraction,
    setAreas: setBookmarkAreas,
    autoSuggestTags,
  } = useBookmarks();
  const { areas, createArea, updateArea, deleteArea, reorderAreas } = useTagAreas();
  const { stats, isLoading: statsLoading } = useStats(bookmarks);
  const {
    currentStatus,
    currentView,
    selectMode,
    selectedIds,
    clearSelection,
    setTag,
    setView,
    showFavorites,
  } = useUI();
  const toast = useToast();
  const queryClient = useQueryClient();
  const db = useSupabase();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackBookmark, setFeedbackBookmark] = useState<Bookmark | null>(null);
  const [showAreaManager, setShowAreaManager] = useState(false);
  const [editingArea, setEditingArea] = useState<TagArea | null>(null);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>(null);
  const [metaProgress, setMetaProgress] = useState<{ current: number; total: number } | null>(null);
  const [isRefreshingMeta, setIsRefreshingMeta] = useState(false);
  const metaFetchedRef = useRef(false);

  // Keyboard shortcuts
  useKeyboardShortcuts(
    useMemo(
      () => ({
        onSearch: () => setShowSearch(true),
        onNewBookmark: () => setShowAddModal(true),
        onNavigateUp: () => {
          /* j/k navigation handled at list level */
        },
        onNavigateDown: () => {
          /* j/k navigation handled at list level */
        },
        onEscape: () => {
          if (selectedBookmark) setSelectedBookmark(null);
          else if (editingBookmark) setEditingBookmark(null);
          else if (showSearch) setShowSearch(false);
        },
      }),
      [selectedBookmark, editingBookmark, showSearch],
    ),
  );

  // Refs to access current values without triggering effect re-runs
  const bookmarksRef = useRef(bookmarks);
  bookmarksRef.current = bookmarks;
  const toastRef = useRef(toast);
  toastRef.current = toast;

  // Auto-fetch missing metadata on first load, then auto-tag untagged bookmarks.
  // Chained into one effect so AI tagging reads enriched data (with titles/excerpts).
  useEffect(() => {
    if (isDemo || isLoading || metaFetchedRef.current) return;
    const currentBookmarks = bookmarksRef.current;
    if (currentBookmarks.length === 0) return;
    metaFetchedRef.current = true;

    let cancelled = false;

    async function enrichAndTag() {
      // Phase 1: Fetch missing metadata.
      // "Missing" means: no title, OR a YouTube bookmark with no channel metadata
      // (title may have been set by oEmbed but channel/duration weren't saved).
      const missing = currentBookmarks.filter(
        (b) => !b.title || (b.source_type === 'youtube' && !b.metadata?.channel),
      );
      if (missing.length > 0) {
        setMetaProgress({ current: 0, total: missing.length });
        const BATCH_SIZE = 3;
        for (let i = 0; i < missing.length; i += BATCH_SIZE) {
          if (cancelled) break;
          const batch = missing.slice(i, i + BATCH_SIZE);
          await Promise.allSettled(
            batch.map(async (b) => {
              try {
                const result = await fetchMetadata(b.url, b.source_type);
                const updates: Record<string, unknown> = {};
                if (result.title) updates.title = result.title;
                if (result.image && !b.image) updates.image = result.image;
                if (result.excerpt && !b.excerpt) updates.excerpt = result.excerpt;
                if (result.metadata) updates.metadata = { ...b.metadata, ...result.metadata };
                if (Object.keys(updates).length > 0) {
                  // Await the DB write so it completes before invalidateQueries fires.
                  await db.from('bookmarks').update(updates).eq('id', b.id);
                }
              } catch {
                /* skip */
              }
            }),
          );
          setMetaProgress({
            current: Math.min(i + BATCH_SIZE, missing.length),
            total: missing.length,
          });
        }
        setMetaProgress(null);
        // All DB writes are complete — safe to refetch now.
        await queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
      }

      if (cancelled) return;

      // Phase 2: AI-tag untagged bookmarks using fresh cache data
      const apiKey = localStorage.getItem('openrouter_key');
      if (!apiKey) return;

      const freshBookmarks =
        queryClient.getQueryData<Bookmark[]>(['bookmarks']) ?? currentBookmarks;
      const untagged = freshBookmarks.filter(
        (b) => (!b.tags || b.tags.length === 0) && (!b.areas || b.areas.length === 0),
      );
      if (untagged.length === 0) return;

      // Read areas from cache at execution time — avoids stale closure from effect deps
      const freshAreas = queryClient.getQueryData<TagArea[]>(['tagAreas']) ?? [];
      for (const b of untagged) {
        if (cancelled) break;
        try {
          await autoSuggestTags(b, freshAreas.length > 0 ? freshAreas : undefined);
        } catch {
          /* skip */
        }
      }
      if (!cancelled) {
        void queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
      }
    }

    void enrichAndTag();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo, isLoading]);

  // Open add modal with shared URL (PWA share target)
  useEffect(() => {
    if (sharedUrl && !isLoading) {
      setShowAddModal(true);
      // Clean query params from URL bar
      if (window.history.replaceState) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [sharedUrl, isLoading]);

  // Compute counts
  const counts = useMemo(
    () => ({
      unread: bookmarks.filter((b) => b.status === 'unread').length,
      reading: bookmarks.filter((b) => b.status === 'reading').length,
      done: bookmarks.filter((b) => b.status === 'done').length,
      favorited: bookmarks.filter((b) => b.is_favorited).length,
    }),
    [bookmarks],
  );

  // All unique tags across bookmarks (for autocomplete)
  const allTags = useMemo(() => [...new Set(bookmarks.flatMap((b) => b.tags))], [bookmarks]);

  // Bookmark count per area (for AreaManager)
  const bookmarkCountByArea = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bookmarks) {
      for (const a of b.areas ?? []) {
        map.set(a.id, (map.get(a.id) ?? 0) + 1);
      }
    }
    return map;
  }, [bookmarks]);

  // Bookmarks filtered by status + favorites for source tabs, area counts, and status pills.
  // BookmarkList handles its own filtering internally, so this is only for count-display components.
  const statusFiltered = useMemo(() => {
    let result = bookmarks;
    if (currentStatus !== 'all') result = result.filter((b) => b.status === currentStatus);
    if (showFavorites) result = result.filter((b) => b.is_favorited);
    return result;
  }, [bookmarks, currentStatus, showFavorites]);

  // Keep selectedBookmark in sync with bookmarks data
  const activeBookmark = useMemo(() => {
    if (!selectedBookmark) return null;
    return bookmarks.find((b) => b.id === selectedBookmark.id) ?? null;
  }, [selectedBookmark, bookmarks]);

  const handleCycleStatus = useCallback(
    (id: string, newStatus: Status) => cycleStatus.mutate({ id, newStatus }),
    [cycleStatus],
  );

  const handleToggleFavorite = useCallback(
    (id: string, is_favorited: boolean) => toggleFavorite.mutate({ id, is_favorited }),
    [toggleFavorite],
  );

  const handleDelete = useCallback((id: string) => deleteBookmark.mutate(id), [deleteBookmark]);

  const handleBookmarkClick = useCallback(
    (id: string) => {
      const bm = bookmarks.find((b) => b.id === id);
      if (bm) setSelectedBookmark(bm);
    },
    [bookmarks],
  );

  const handleAddNote = useCallback(
    (bookmarkId: string, type: NoteType, content: string) => {
      addNote.mutate({ bookmarkId, type, content });
    },
    [addNote],
  );

  const handleDeleteNote = useCallback(
    (bookmarkId: string, noteIndex: number) => {
      deleteNote.mutate({ bookmarkId, noteIndex });
    },
    [deleteNote],
  );

  async function handleRefreshMetadata(bookmark: Bookmark) {
    setIsRefreshingMeta(true);
    try {
      await refreshMetadata(bookmark);
      toast.success('Metadata refreshed');
    } catch {
      toast.error('Could not fetch metadata');
    } finally {
      setIsRefreshingMeta(false);
    }
  }

  async function handleExport(bookmark: Bookmark) {
    const vaultName = localStorage.getItem('obsidian_vault') ?? '';
    const vaultFolder = localStorage.getItem('obsidian_vault_folder') ?? 'ContentDeck';
    if (vaultName) {
      const success = exportToObsidianUri(bookmark, vaultName, vaultFolder);
      if (success) {
        markSynced.mutate(bookmark.id);
        toast.success('Opening in Obsidian…');
      }
    } else {
      // No vault configured — copy markdown to clipboard
      const success = await exportToClipboard(bookmark);
      if (success) {
        markSynced.mutate(bookmark.id);
        toast.info('Markdown copied — add vault name in Settings for one-click export');
      }
    }
  }

  // Area interactions
  function handleAreaClick(areaName: string) {
    if (areaName === '__untagged__') {
      setTag('__untagged__');
    } else {
      setTag(areaName);
    }
    setView('list');
  }

  function handleEditArea(area: TagArea) {
    setEditingArea(area);
    setShowAreaManager(true);
  }

  // Bulk operations
  function handleBulkStatus(status: Status) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    bulkUpdateStatus.mutate({ ids, status });
    clearSelection();
  }

  function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (confirm(`Delete ${ids.length} bookmarks?`)) {
      bulkDelete.mutate(ids);
      clearSelection();
    }
  }

  return (
    <>
      <div className="flex h-[100dvh] bg-surface-50 dark:bg-surface-950">
        <AppShell
          counts={counts}
          onAdd={() => setShowAddModal(true)}
          onSignOut={onSignOut}
          onToggleSearch={() => setShowSearch((s) => !s)}
          onSettings={() => setShowSettings(true)}
          onStats={() => setShowStats(true)}
          onFeedback={() => {
            setFeedbackBookmark(activeBookmark);
            setShowFeedback(true);
          }}
          showSearch={showSearch}
        >
          {metaProgress && (
            <ProgressBar
              current={metaProgress.current}
              total={metaProgress.total}
              label={`Fetching metadata ${metaProgress.current}/${metaProgress.total}`}
            />
          )}
          <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
            {currentView === 'areas' ? (
              <AreasView
                areas={areas}
                bookmarks={statusFiltered}
                onAreaClick={handleAreaClick}
                onEditArea={handleEditArea}
                onManageAreas={() => {
                  setEditingArea(null);
                  setShowAreaManager(true);
                }}
              />
            ) : (
              <>
                <SourceTabs bookmarks={statusFiltered} />
                <FeedToolbar bookmarks={statusFiltered} showSearch={showSearch} />
                <BookmarkList
                  bookmarks={bookmarks}
                  isLoading={isLoading}
                  onCycleStatus={handleCycleStatus}
                  onToggleFavorite={handleToggleFavorite}
                  onDelete={handleDelete}
                  onClick={handleBookmarkClick}
                />
              </>
            )}
          </div>
        </AppShell>

        {/* Detail Panel — AnimatePresence enables entry/exit animations */}
        <AnimatePresence>
          {activeBookmark && (
            <DetailPanel
              key={activeBookmark.id}
              bookmark={activeBookmark}
              onClose={() => setSelectedBookmark(null)}
              onCycleStatus={handleCycleStatus}
              onToggleFavorite={handleToggleFavorite}
              onAddNote={handleAddNote}
              onDeleteNote={handleDeleteNote}
              onEdit={(bm) => setEditingBookmark(bm)}
              onExport={handleExport}
              onDelete={(id) => {
                handleDelete(id);
                setSelectedBookmark(null);
              }}
              onRefreshMetadata={handleRefreshMetadata}
              onRetryExtraction={retryExtraction}
              isNotePending={addNote.isPending}
              isRefreshing={isRefreshingMeta}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <AddBookmarkModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={(data) => {
          const { areaIds, ...bookmarkData } = data;
          addBookmark.mutate(bookmarkData, {
            onSuccess: (newBookmark) => {
              // Assign areas after bookmark is created
              if (areaIds && areaIds.length > 0) {
                const selectedAreas = areas.filter((a) => areaIds.includes(a.id));
                void setBookmarkAreas(newBookmark.id, selectedAreas);
              }
            },
          });
        }}
        isPending={addBookmark.isPending}
        initialUrl={sharedUrl ?? undefined}
        allAreas={areas}
        allTags={allTags}
      />

      <EditBookmarkModal
        open={editingBookmark !== null}
        bookmark={editingBookmark}
        onClose={() => setEditingBookmark(null)}
        onSave={(id, updates, areaIds) => {
          updateBookmark.mutate({ id, ...updates });
          // Update area assignments via junction table
          const selectedAreas = areas.filter((a) => areaIds.includes(a.id));
          void setBookmarkAreas(id, selectedAreas);
        }}
        isPending={updateBookmark.isPending}
        allAreas={areas}
        allTags={allTags}
      />

      <FeedbackModal
        open={showFeedback}
        onClose={() => {
          setShowFeedback(false);
          setFeedbackBookmark(null);
        }}
        activeBookmark={feedbackBookmark}
      />

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        userEmail={userEmail}
        onSignOut={onSignOut}
        isDemo={isDemo}
      />

      <StatsModal
        open={showStats}
        onClose={() => setShowStats(false)}
        stats={stats}
        isLoading={statsLoading}
      />

      <AreaManager
        open={showAreaManager}
        onClose={() => {
          setShowAreaManager(false);
          setEditingArea(null);
        }}
        areas={areas}
        editingArea={editingArea}
        bookmarkCountByArea={bookmarkCountByArea}
        onCreate={(data) => createArea.mutate(data)}
        onUpdate={(id, data) => updateArea.mutate({ id, ...data })}
        onDelete={(id) => deleteArea.mutate(id)}
        onReorder={(ids) => reorderAreas.mutate(ids)}
      />

      {/* Bulk Action Bar */}
      {selectMode && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onChangeStatus={handleBulkStatus}
          onDelete={handleBulkDelete}
          onCancel={clearSelection}
        />
      )}
    </>
  );
}
