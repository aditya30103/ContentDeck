import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useTransform, useMotionValue } from 'framer-motion';
import { X, BookOpen } from 'lucide-react';
import MetadataHeader from './MetadataHeader';
import NotesTab from './NotesTab';
import DetailActions from './DetailActions';
import ReaderModal from '../reader/ReaderModal';
import type { Bookmark, Status, NoteType } from '../../types';

interface DetailPanelProps {
  bookmark: Bookmark | null;
  onClose: () => void;
  onCycleStatus: (id: string, newStatus: Status) => void;
  onToggleFavorite: (id: string, favorited: boolean) => void;
  onAddNote: (bookmarkId: string, type: NoteType, content: string) => void;
  onDeleteNote: (bookmarkId: string, noteIndex: number) => void;
  onEdit: (bookmark: Bookmark) => void;
  onExport: (bookmark: Bookmark) => void;
  onDelete: (id: string) => void;
  onRefreshMetadata: (bookmark: Bookmark) => void;
  isNotePending: boolean;
  isRefreshing?: boolean;
}

export default function DetailPanel({
  bookmark,
  onClose,
  onCycleStatus,
  onToggleFavorite,
  onAddNote,
  onDeleteNote,
  onEdit,
  onExport,
  onDelete,
  onRefreshMetadata,
  isNotePending,
  isRefreshing,
}: DetailPanelProps) {
  const [showReader, setShowReader] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragY = useMotionValue(0);
  const backdropOpacity = useTransform(dragY, [0, 300], [0.5, 0]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (bookmark) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [bookmark, handleKeyDown]);

  if (!bookmark) return null;

  const handleDragEnd = (event: { offset?: { y?: number }; velocity?: { y?: number } }) => {
    const panelHeight = panelRef.current?.offsetHeight || 400;
    const dragThreshold = panelHeight * 0.4; // 40% of panel height
    const offset = event.offset?.y ?? 0;
    const velocity = event.velocity?.y ?? 0;

    // Dismiss if dragged down > 40% of height OR velocity > 500px/s
    if (offset > dragThreshold || velocity > 500) {
      onClose();
    } else {
      // Snap back
      dragY.set(0);
    }
  };

  const canRead = bookmark.content_status === 'success' && !!bookmark.content?.text;
  const isExtracting =
    bookmark.content_status === 'pending' || bookmark.content_status === 'extracting';

  function handleDelete() {
    if (confirm('Delete this bookmark?')) {
      onDelete(bookmark!.id);
      onClose();
    }
  }

  return (
    <>
      {/* Reader Modal — covers everything */}
      <ReaderModal
        bookmark={bookmark}
        open={showReader}
        onClose={() => setShowReader(false)}
        onCycleStatus={onCycleStatus}
      />

      {/* Mobile: full-screen slide-up overlay */}
      <AnimatePresence>
        {bookmark && (
          <>
            <motion.div
              ref={overlayRef}
              className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              style={{ opacity: backdropOpacity }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={(e) => {
                if (e.target === overlayRef.current) onClose();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onClose();
              }}
            >
              <motion.div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label="Bookmark details"
                className="absolute inset-x-0 bottom-0 top-12 bg-surface-50 dark:bg-surface-900 rounded-t-2xl shadow-xl overflow-y-auto"
                style={{
                  paddingBottom: 'calc(16px + var(--safe-bottom))',
                  y: dragY,
                }}
                initial={{ y: 500 }}
                animate={{ y: 0 }}
                exit={{ y: 500 }}
                transition={{
                  type: 'spring',
                  damping: 25,
                  stiffness: 500,
                }}
                drag="y"
                dragConstraints={{ top: 0 }}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
              >
          {/* Mobile header with drag handle */}
          <div
            className="sticky top-0 flex flex-col items-center p-2 bg-surface-50 dark:bg-surface-900 rounded-t-2xl z-10 cursor-grab active:cursor-grabbing"
            style={{ touchAction: 'none' }}
          >
            {/* Drag handle pill */}
            <div className="w-12 h-1 rounded-full bg-surface-300 dark:bg-surface-700 mb-3" />

            <div className="flex items-center justify-between w-full px-2 border-b border-surface-200 dark:border-surface-700 pb-4">
              <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100 truncate">
                Details
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 min-w-[44px] min-h-[44px] flex items-center justify-center text-surface-500 dark:text-surface-400"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-6">
            <MetadataHeader
              bookmark={bookmark}
              onCycleStatus={onCycleStatus}
              onToggleFavorite={onToggleFavorite}
              onRefreshMetadata={onRefreshMetadata}
              isRefreshing={isRefreshing}
            />
            {(canRead || isExtracting) && (
              <button
                onClick={() => setShowReader(true)}
                disabled={!canRead}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
                aria-label={isExtracting ? 'Extracting content…' : 'Open reader mode'}
              >
                <BookOpen size={16} />
                {isExtracting ? 'Extracting…' : 'Read'}
              </button>
            )}
            <NotesTab
              notes={bookmark.notes}
              onAddNote={(type, content) => onAddNote(bookmark.id, type, content)}
              onDeleteNote={(index) => onDeleteNote(bookmark.id, index)}
              isPending={isNotePending}
            />
            <DetailActions
              bookmark={bookmark}
              onEdit={() => {
                onClose();
                onEdit(bookmark);
              }}
              onExport={() => onExport(bookmark)}
              onDelete={handleDelete}
            />
          </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop: right column panel */}
      <aside className="hidden lg:flex flex-col w-[400px] h-screen border-l border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 z-10">
          <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100">
            Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 min-w-[44px] min-h-[44px] flex items-center justify-center text-surface-500 dark:text-surface-400"
            aria-label="Close panel"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 p-4 space-y-6">
          <MetadataHeader
            bookmark={bookmark}
            onCycleStatus={onCycleStatus}
            onToggleFavorite={onToggleFavorite}
            onRefreshMetadata={onRefreshMetadata}
            isRefreshing={isRefreshing}
          />
          {(canRead || isExtracting) && (
            <button
              onClick={() => setShowReader(true)}
              disabled={!canRead}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
              aria-label={isExtracting ? 'Extracting content…' : 'Open reader mode'}
            >
              <BookOpen size={16} />
              {isExtracting ? 'Extracting…' : 'Read'}
            </button>
          )}
          <NotesTab
            notes={bookmark.notes}
            onAddNote={(type, content) => onAddNote(bookmark.id, type, content)}
            onDeleteNote={(index) => onDeleteNote(bookmark.id, index)}
            isPending={isNotePending}
          />
          <DetailActions
            bookmark={bookmark}
            onEdit={() => {
              onClose();
              onEdit(bookmark);
            }}
            onExport={() => onExport(bookmark)}
            onDelete={handleDelete}
          />
        </div>
      </aside>
    </>
  );
}
