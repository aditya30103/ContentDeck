import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useUI } from '../../context/UIProvider';
import { useFeedback } from '../../hooks/useFeedback';
import type {
  Bookmark,
  FeedbackType,
  FeedbackSeverity,
  AppContext,
  SystemContext,
} from '../../types';

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  activeBookmark?: Bookmark | null;
}

const isDemo = () => localStorage.getItem('contentdeck_demo') === 'true';

export default function FeedbackModal({ open, onClose, activeBookmark }: FeedbackModalProps) {
  const { currentStatus, showFavorites, currentTag, searchQuery, currentSort, currentView } =
    useUI();
  const { submitFeedback } = useFeedback();

  const [feedbackType, setFeedbackType] = useState<FeedbackType>('bug');
  const [severity, setSeverity] = useState<FeedbackSeverity>('minor');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [attachBookmark, setAttachBookmark] = useState<Bookmark | null>(null);
  const [appContext, setAppContext] = useState<AppContext | null>(null);
  const [systemContext, setSystemContext] = useState<SystemContext | null>(null);

  // Snapshot context once when the modal opens
  useEffect(() => {
    if (open) {
      setAttachBookmark(activeBookmark ?? null);
      setAppContext({
        statusFilter: currentStatus,
        showFavorites,
        selectedTag: currentTag,
        searchQuery,
        sort: currentSort,
        viewMode: currentView,
        activeBookmarkId: activeBookmark?.id ?? null,
        activeBookmarkTitle: activeBookmark?.title ?? null,
      });
      setSystemContext({
        userAgent: navigator.userAgent,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        online: navigator.onLine,
        timestamp: new Date().toISOString(),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot intent: capture once at open time
  }, [open]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setFeedbackType('bug');
      setSeverity('minor');
      setTitle('');
      setDescription('');
      setAttachBookmark(null);
      setAppContext(null);
      setSystemContext(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!appContext || !systemContext) return;

    await submitFeedback.mutateAsync({
      feedback_type: feedbackType,
      title: title.trim(),
      description: description.trim() || null,
      severity: feedbackType === 'bug' ? severity : 'minor',
      app_context: appContext,
      system_context: systemContext,
      active_bookmark_id: attachBookmark?.id ?? null,
    });
    onClose();
  }

  const contextJson = appContext
    ? JSON.stringify({ app: appContext, system: systemContext }, null, 2)
    : '';

  return (
    <Modal open={open} onClose={onClose} title="Send Feedback" size="md">
      {isDemo() ? (
        <div className="py-8 text-center">
          <p className="text-sm text-surface-600 dark:text-surface-400 mb-4">
            Sign in to submit feedback.
          </p>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {/* Type */}
          <fieldset>
            <legend className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
              Type
            </legend>
            <div className="flex gap-3">
              {(['bug', 'suggestion', 'other'] as FeedbackType[]).map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-1.5 cursor-pointer text-sm text-surface-700 dark:text-surface-300"
                >
                  <input
                    type="radio"
                    name="feedback-type"
                    value={type}
                    checked={feedbackType === type}
                    onChange={() => setFeedbackType(type)}
                    className="accent-primary-600"
                  />
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Severity (bugs only) */}
          {feedbackType === 'bug' && (
            <div>
              <label
                htmlFor="feedback-severity"
                className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
              >
                Severity
              </label>
              <select
                id="feedback-severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as FeedbackSeverity)}
                className="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 text-sm min-h-[44px]"
              >
                <option value="blocking">Blocking — can't use the app</option>
                <option value="major">Major — significant impact</option>
                <option value="minor">Minor — noticeable but workable</option>
                <option value="polish">Polish — small cosmetic issue</option>
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label
              htmlFor="feedback-title"
              className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="feedback-title"
              type="text"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                feedbackType === 'bug' ? 'Describe the bug briefly' : 'What would you like?'
              }
              className="w-full px-3 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 text-sm min-h-[44px]"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="feedback-desc"
              className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
            >
              Description <span className="text-surface-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="feedback-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Steps to reproduce, expected vs actual behaviour, etc."
              className="w-full px-3 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 text-sm resize-none"
            />
          </div>

          {/* Attached bookmark */}
          {attachBookmark && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-100 dark:bg-surface-800 text-sm">
              <span className="flex-1 truncate text-surface-700 dark:text-surface-300">
                Attached:{' '}
                <span className="font-medium">{attachBookmark.title ?? attachBookmark.url}</span>
              </span>
              <button
                type="button"
                onClick={() => setAttachBookmark(null)}
                className="text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 p-1 min-w-[28px] min-h-[28px] flex items-center justify-center"
                aria-label="Detach bookmark"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Context disclosure */}
          {contextJson && (
            <details className="text-xs">
              <summary className="cursor-pointer text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 select-none">
                Context captured automatically
              </summary>
              <pre className="mt-2 p-3 rounded-lg bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 overflow-x-auto whitespace-pre-wrap break-all">
                {contextJson}
              </pre>
            </details>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={submitFeedback.isPending || !title.trim()}
            >
              {submitFeedback.isPending ? 'Submitting…' : 'Submit Feedback'}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
