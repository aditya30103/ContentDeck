import { useState, useEffect, useCallback } from 'react';
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useMotionValue,
  useTransform,
} from 'framer-motion';
import { X, BookOpen } from 'lucide-react';
import MetadataHeader from './MetadataHeader';
import NotesTab from './NotesTab';
import DetailActions from './DetailActions';
import ReaderModal from '../reader/ReaderModal';
import type { Bookmark, Status, NoteType } from '../../types';
import {
  SPRING_SHEET,
  SHEET_DISMISS_FRACTION,
  SHEET_DISMISS_VELOCITY,
  REDUCED_MOTION_TRANSITION,
} from '../../lib/motion';

interface DetailPanelProps {
  bookmark: Bookmark;
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
  const shouldReduceMotion = useReducedMotion();

  // Drive backdrop opacity from live drag offset
  const dragY = useMotionValue(0);
  const backdropOpacity = useTransform(dragY, [0, 350], [0.5, 0]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const transition = shouldReduceMotion ? REDUCED_MOTION_TRANSITION : SPRING_SHEET;

  const canRead = bookmark.content_status === 'success' && !!bookmark.content?.text;
  const isExtracting =
    bookmark.content_status === 'pending' || bookmark.content_status === 'extracting';

  function handleDelete() {
    if (confirm('Delete this bookmark?')) {
      onDelete(bookmark.id);
      onClose();
    }
  }

  const sharedContent = (
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
  );

  return (
    <>
      {/* Reader Modal — AnimatePresence for slide-in/out */}
      <AnimatePresence>
        {showReader && (
          <ReaderModal
            key="reader"
            bookmark={bookmark}
            open={showReader}
            onClose={() => setShowReader(false)}
            onCycleStatus={onCycleStatus}
          />
        )}
      </AnimatePresence>

      {/* Mobile: draggable bottom sheet */}
      <div className="lg:hidden fixed inset-0 z-50">
        {/* Backdrop */}
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- backdrop click-to-close is progressive enhancement; keyboard users have ESC via document-level handler */}
        <motion.div
          className="absolute inset-0 bg-black backdrop-blur-sm"
          style={{ opacity: backdropOpacity }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
          }}
        />

        {/* Sheet */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Bookmark details"
          className="absolute inset-x-0 bottom-0 top-12 bg-surface-50 dark:bg-surface-900 rounded-t-2xl shadow-xl overflow-y-auto"
          style={{ paddingBottom: 'calc(16px + var(--safe-bottom))', touchAction: 'pan-y' }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={transition}
          drag="y"
          dragConstraints={{ top: 0 }}
          dragElastic={0.1}
          dragMomentum={false}
          onDrag={(_, info) => {
            dragY.set(Math.max(0, info.offset.y));
          }}
          onDragEnd={(_, info) => {
            const sheetHeight = window.innerHeight - 48; // top-12 = 48px
            if (
              info.offset.y > sheetHeight * SHEET_DISMISS_FRACTION ||
              info.velocity.y > SHEET_DISMISS_VELOCITY
            ) {
              onClose();
            } else {
              dragY.set(0);
            }
          }}
        >
          {/* Drag handle pill */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-surface-300 dark:bg-surface-600" />
          </div>

          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 rounded-t-2xl z-10">
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

          {sharedContent}
        </motion.div>
      </div>

      {/* Desktop: right column panel with subtle slide-in */}
      <motion.aside
        className="hidden lg:flex flex-col w-[400px] h-[100dvh] border-l border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900 overflow-y-auto"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={shouldReduceMotion ? REDUCED_MOTION_TRANSITION : { duration: 0.15 }}
      >
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

        <div className="flex-1 p-4 space-y-6">{sharedContent}</div>
      </motion.aside>
    </>
  );
}
