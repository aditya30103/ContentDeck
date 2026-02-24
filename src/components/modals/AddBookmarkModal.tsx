import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import TagAreaInput from '../ui/TagAreaInput';
import { detectSourceType } from '../../lib/utils';
import { SourceBadge } from '../ui/Badge';
import type { BookmarkMetadata, SourceType, TagArea } from '../../types';

interface AddBookmarkModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (data: {
    url?: string;
    title?: string;
    source_type?: string;
    tags?: string[];
    areaIds?: string[];
    metadata?: BookmarkMetadata;
  }) => void;
  isPending: boolean;
  initialUrl?: string;
  allAreas: TagArea[];
  allTags: string[];
}

export default function AddBookmarkModal({
  open,
  onClose,
  onAdd,
  isPending,
  initialUrl,
  allAreas,
  allTags,
}: AddBookmarkModalProps) {
  const [bookMode, setBookMode] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [detectedSource, setDetectedSource] = useState<SourceType | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<TagArea[]>([]);

  // Pre-fill from share target or prop
  useEffect(() => {
    if (open && initialUrl && !url) {
      setUrl(initialUrl);
      setDetectedSource(detectSourceType(initialUrl));
    }
  }, [open, initialUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setUrl('');
      setTitle('');
      setAuthor('');
      setDetectedSource(null);
      setTags([]);
      setSelectedAreas([]);
      // Keep bookMode — user may want to log multiple books in a row
    }
  }, [open]);

  function handleUrlChange(value: string) {
    setUrl(value);
    if (value.trim()) {
      setDetectedSource(detectSourceType(value.trim()));
    } else {
      setDetectedSource(null);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (bookMode) {
      if (!title.trim()) return;
      onAdd({
        url: url.trim() || undefined,
        title: title.trim(),
        source_type: 'book',
        tags: tags.length > 0 ? tags : undefined,
        areaIds: selectedAreas.length > 0 ? selectedAreas.map((a) => a.id) : undefined,
        metadata: author.trim() ? { author: author.trim() } : undefined,
      });
    } else {
      if (!url.trim()) return;
      onAdd({
        url: url.trim(),
        title: title.trim() || undefined,
        source_type: detectedSource ?? undefined,
        tags: tags.length > 0 ? tags : undefined,
        areaIds: selectedAreas.length > 0 ? selectedAreas.map((a) => a.id) : undefined,
      });
    }

    setUrl('');
    setTitle('');
    setAuthor('');
    setDetectedSource(null);
    setTags([]);
    setSelectedAreas([]);
    onClose();
  }

  const canSubmit = bookMode ? title.trim().length > 0 : url.trim().length > 0;

  return (
    <Modal open={open} onClose={onClose} title="Add Bookmark">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Book mode toggle */}
        <button
          type="button"
          onClick={() => setBookMode((m) => !m)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
            bookMode
              ? 'border-primary-500 bg-primary-600/10 text-primary-700 dark:text-primary-300'
              : 'border-surface-200 dark:border-surface-700 text-surface-500 dark:text-surface-400 hover:border-surface-300 dark:hover:border-surface-600'
          }`}
        >
          <span>📚</span>
          {bookMode ? 'Logging a book (no URL needed)' : 'Log a book without a URL'}
        </button>

        {/* URL — required normally, optional in book mode */}
        <div>
          <label
            htmlFor="add-url"
            className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
          >
            URL{' '}
            {bookMode && <span className="text-surface-400 font-normal">(optional for books)</span>}
          </label>
          <input
            id="add-url"
            type="url"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder={bookMode ? 'https://... (optional)' : 'https://...'}
            required={!bookMode}
            className="w-full px-3 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 min-h-[44px]"
          />
          {!bookMode && detectedSource && (
            <div className="mt-2">
              <SourceBadge source={detectedSource} />
            </div>
          )}
          {bookMode && (
            <div className="mt-2">
              <SourceBadge source="book" />
            </div>
          )}
        </div>

        {/* Title — optional normally, required in book mode */}
        <div>
          <label
            htmlFor="add-title"
            className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
          >
            Title{' '}
            <span className="text-surface-400 font-normal">
              {bookMode ? '(required)' : '(optional, auto-fetched)'}
            </span>
          </label>
          <input
            id="add-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={bookMode ? 'Book title' : 'Page title'}
            required={bookMode}
            className="w-full px-3 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 min-h-[44px]"
          />
        </div>

        {/* Author — book mode only */}
        {bookMode && (
          <div>
            <label
              htmlFor="add-author"
              className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
            >
              Author <span className="text-surface-400 font-normal">(optional)</span>
            </label>
            <input
              id="add-author"
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Author name"
              className="w-full px-3 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 min-h-[44px]"
            />
          </div>
        )}

        {/* Areas & Tags */}
        <div>
          <label
            htmlFor="add-tags"
            className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1"
          >
            Areas & Tags{' '}
            <span className="text-surface-400 font-normal">(type to search, comma to add)</span>
          </label>
          <TagAreaInput
            id="add-tags"
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
            {isPending ? 'Saving...' : bookMode ? 'Log Book' : 'Save Bookmark'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
