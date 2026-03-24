import { useUI } from '../../context/UIProvider';
import type { SortOption } from '../../types';

const options: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'title', label: 'Title' },
];

export default function SortSelect() {
  const { currentSort, setSort } = useUI();

  return (
    <select
      value={currentSort}
      onChange={(e) => setSort(e.target.value as SortOption)}
      aria-label="Sort bookmarks"
      className="px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-base text-surface-900 dark:text-surface-100 min-h-[40px]"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
