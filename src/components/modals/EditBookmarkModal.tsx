import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import TagAreaInput from '../ui/TagAreaInput';
import { SourceBadge } from '../ui/Badge';
import type { Bookmark, SourceType, Status, TagArea } from '../../types';
import { SOURCE_LIST, SOURCE_LABELS, STATUS_LIST } from '../../types';

interface EditBookmarkModalProps {
  open: boolean;
  bookmark: Bookmark | null;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Bookmark>, areaIds: string[]) => void;
  isPending: boolean;
  allAreas: TagArea[];
  allTags: string[];
}

export default function EditBookmarkModal({
  open,
  bookmark,
  onClose,
  onSave,
  isPending,
  allAreas,
  allTags,
}: EditBookmarkModalProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [sourceType, setSourceType] = useState<SourceType>('blog');
  const [status, setStatus] = useState<Status>('unread');
  const [tags, setTags] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<TagArea[]>([]);

  // Sync form state when bookmark changes
  useEffect(() => {
    if (bookmark) {
      // Show empty string for sentinel URL so the field is blank for books
      setUrl(bookmark.url.startsWith('http') ? bookmark.url : '');
      setTitle(bookmark.title ?? '');
      setAuthor(bookmark.metadata?.author ?? '');
      setSourceType(bookmark.source_type);
      setStatus(bookmark.status);
      setTags(bookmark.tags ?? []);
      setSelectedAreas(bookmark.areas ?? []);
    }
  }, [bookmark]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bookmark) return;

    const isBook = sourceType === 'book';
    // URL required only when not a book
    if (!isBook && !url.trim()) return;

    const savedUrl = url.trim() || (isBook ? 'book://no-url' : '');
    const updatedMetadata = author.trim()
      ? { ...bookmark.metadata, author: author.trim() }
      : bookmark.metadata;

    onSave(
      bookmark.id,
      {
        url: savedUrl,
        title: title.trim() || null,
        source_type: sourceType,
        status,
        tags,
        metadata: updatedMetadata,
      },
      selectedAreas.map((a) => a.id),
    );
    onClose();
  }

  if (!bookmark) return null;

  const isBook = sourceType === 'book';
  const canSubmit = isBook ? true : url.trim().length > 0;

  return (
    <Modal open={open} onClose={onClose} title="Edit Bookmark">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* URL */}
        <div>
          <label
            htmlFor="edit-url"
            className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
          >
            URL{' '}
            {isBook && <span className="text-surface-400 font-normal">(optional for books)</span>}
          </label>
          <input
            id="edit-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={isBook ? 'https://... (optional)' : 'https://...'}
            required={!isBook}
            className="w-full px-3 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 min-h-[44px]"
          />
        </div>

        {/* Title */}
        <div>
          <label
            htmlFor="edit-title"
            className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
          >
            Title
          </label>
          <input
            id="edit-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full px-3 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 min-h-[44px]"
          />
        </div>

        {/* Author — book only */}
        {isBook && (
          <div>
            <label
              htmlFor="edit-author"
              className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
            >
              Author <span className="text-surface-400 font-normal">(optional)</span>
            </label>
            <input
              id="edit-author"
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Author name"
              className="w-full px-3 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 min-h-[44px]"
            />
          </div>
        )}

        {/* Source Type + Status row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="edit-source"
              className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
            >
              Source
            </label>
            <div className="relative">
              <select
                id="edit-source"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as SourceType)}
                className="w-full px-3 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 min-h-[44px] appearance-none"
              >
                {SOURCE_LIST.map((s) => (
                  <option key={s} value={s}>
                    {SOURCE_LABELS[s]}
                  </option>
                ))}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <SourceBadge source={sourceType} />
              </div>
            </div>
          </div>
          <div>
            <label
              htmlFor="edit-status"
              className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
            >
              Status
            </label>
            <select
              id="edit-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              className="w-full px-3 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 min-h-[44px]"
            >
              {STATUS_LIST.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Areas & Tags */}
        <div>
          <label
            htmlFor="edit-tags"
            className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
          >
            Areas & Tags{' '}
            <span className="text-surface-400 font-normal">(type to search, comma to add)</span>
          </label>
          <TagAreaInput
            id="edit-tags"
            tags={tags}
            areas={selectedAreas}
            allAreas={allAreas}
            allTags={allTags}
            onTagsChange={setTags}
            onAreasChange={setSelectedAreas}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit || isPending}>
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
