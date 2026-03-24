import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { TagArea } from '../../types';

interface TagAreaInputProps {
  tags: string[];
  areas: TagArea[];
  allAreas: TagArea[];
  allTags: string[];
  onTagsChange: (tags: string[]) => void;
  onAreasChange: (areas: TagArea[]) => void;
  id?: string;
}

export default function TagAreaInput({
  tags,
  areas,
  allAreas,
  allTags,
  onTagsChange,
  onAreasChange,
  id,
}: TagAreaInputProps) {
  const [input, setInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Build filtered suggestions
  const query = input.toLowerCase().trim();
  const assignedAreaIds = new Set(areas.map((a) => a.id));
  const assignedTagSet = new Set(tags.map((t) => t.toLowerCase()));

  const areaSuggestions = useMemo(
    () =>
      allAreas.filter(
        (a) => !assignedAreaIds.has(a.id) && (query === '' || a.name.toLowerCase().includes(query)),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allAreas, query, areas],
  );

  const tagSuggestions = useMemo(
    () =>
      allTags.filter(
        (t) =>
          !assignedTagSet.has(t.toLowerCase()) && (query === '' || t.toLowerCase().includes(query)),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allTags, query, tags],
  );

  // Merge into a single list: areas first, then tags
  const suggestions = useMemo(
    () => [
      ...areaSuggestions.map((a) => ({ type: 'area' as const, area: a })),
      ...tagSuggestions.slice(0, 10).map((t) => ({ type: 'tag' as const, tag: t })),
    ],
    [areaSuggestions, tagSuggestions],
  );

  const showSuggestions = showDropdown && suggestions.length > 0 && input.length > 0;

  const selectSuggestion = useCallback(
    (index: number) => {
      const item = suggestions[index];
      if (!item) return;
      if (item.type === 'area') {
        onAreasChange([...areas, item.area]);
      } else {
        onTagsChange([...tags, item.tag]);
      }
      setInput('');
      setHighlightIndex(-1);
      inputRef.current?.focus();
    },
    [suggestions, areas, tags, onAreasChange, onTagsChange],
  );

  function addTag(value: string) {
    const tag = value.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      onTagsChange([...tags, tag]);
    }
    setInput('');
  }

  function removeTag(tag: string) {
    onTagsChange(tags.filter((t) => t !== tag));
  }

  function removeArea(areaId: string) {
    onAreasChange(areas.filter((a) => a.id !== areaId));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' && highlightIndex >= 0) {
        e.preventDefault();
        selectSuggestion(highlightIndex);
        return;
      }
      if (e.key === 'Escape') {
        setShowDropdown(false);
        return;
      }
    }

    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (input.trim()) addTag(input);
    }
    if (e.key === 'Backspace' && !input) {
      if (tags.length > 0) {
        onTagsChange(tags.slice(0, -1));
      } else if (areas.length > 0) {
        onAreasChange(areas.slice(0, -1));
      }
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 min-h-[44px]">
        {/* Area pills */}
        {areas.map((area) => (
          <span
            key={area.id}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium text-white"
            style={{ backgroundColor: area.color || '#6366f1' }}
          >
            {area.emoji && <span className="text-xs">{area.emoji}</span>}
            {area.name}
            <button
              type="button"
              onClick={() => removeArea(area.id)}
              className="text-white/70 hover:text-white min-w-[20px] min-h-[20px] flex items-center justify-center"
              aria-label={`Remove area ${area.name}`}
            >
              &times;
            </button>
          </span>
        ))}

        {/* Tag pills */}
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary-600/10 text-primary-600 dark:text-primary-400 text-sm font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-surface-400 hover:text-red-500 min-w-[20px] min-h-[20px] flex items-center justify-center"
              aria-label={`Remove tag ${tag}`}
            >
              &times;
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          id={id}
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowDropdown(true);
            setHighlightIndex(-1);
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={areas.length === 0 && tags.length === 0 ? 'Add areas or tags...' : ''}
          className="flex-1 min-w-[80px] bg-transparent text-base text-surface-900 dark:text-surface-100 placeholder:text-surface-400 outline-none py-1"
        />
      </div>

      {/* Dropdown */}
      {showSuggestions && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 shadow-lg">
          {areaSuggestions.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-xs font-medium text-surface-400 uppercase tracking-wider">
                Areas
              </div>
              {areaSuggestions.map((area, idx) => (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => selectSuggestion(idx)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                    highlightIndex === idx
                      ? 'bg-primary-50 dark:bg-primary-900/20'
                      : 'hover:bg-surface-50 dark:hover:bg-surface-700/50'
                  }`}
                >
                  {area.emoji && <span>{area.emoji}</span>}
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: area.color || '#6366f1' }}
                  />
                  <span className="font-medium text-surface-900 dark:text-surface-100">
                    {area.name}
                  </span>
                </button>
              ))}
            </>
          )}
          {tagSuggestions.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-xs font-medium text-surface-400 uppercase tracking-wider">
                Tags
              </div>
              {tagSuggestions.slice(0, 10).map((tag, idx) => {
                const globalIdx = areaSuggestions.length + idx;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => selectSuggestion(globalIdx)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      highlightIndex === globalIdx
                        ? 'bg-primary-50 dark:bg-primary-900/20'
                        : 'hover:bg-surface-50 dark:hover:bg-surface-700/50'
                    }`}
                  >
                    <span className="text-surface-700 dark:text-surface-300">{tag}</span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
