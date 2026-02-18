import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReaderModal from '../reader/ReaderModal';
import type { Bookmark } from '../../types';

// Stub localStorage
const localStorageStore: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (k: string) => localStorageStore[k] ?? null,
  setItem: (k: string, v: string) => {
    localStorageStore[k] = v;
  },
  removeItem: (k: string) => {
    delete localStorageStore[k];
  },
  clear: () => Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k]),
});

function makeBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: 'bm-1',
    url: 'https://example.com/article',
    title: 'Test Article Title',
    image: null,
    excerpt: 'A short excerpt.',
    source_type: 'blog',
    status: 'reading',
    is_favorited: false,
    notes: [],
    tags: [],
    areas: [],
    metadata: {},
    content: {
      text: 'First paragraph of the article.\n\nSecond paragraph with more content.\n\nThird paragraph here.',
      author: 'Jane Author',
      word_count: 500,
      reading_time: 2,
    },
    content_status: 'success',
    content_fetched_at: new Date().toISOString(),
    synced: false,
    created_at: new Date().toISOString(),
    status_changed_at: new Date().toISOString(),
    started_reading_at: null,
    finished_at: null,
    ...overrides,
  };
}

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  onCycleStatus: vi.fn(),
};

describe('ReaderModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageStore['reader_prefs'] = JSON.stringify({
      fontSize: 'md',
      fontFamily: 'sans',
      theme: 'light',
    });
  });

  it('renders the bookmark title', () => {
    render(<ReaderModal bookmark={makeBookmark()} {...defaultProps} />);
    // Title appears in both header and article heading
    expect(screen.getAllByText('Test Article Title').length).toBeGreaterThan(0);
  });

  it('renders extracted content as separate paragraphs', () => {
    render(<ReaderModal bookmark={makeBookmark()} {...defaultProps} />);
    expect(screen.getByText('First paragraph of the article.')).toBeInTheDocument();
    expect(screen.getByText('Second paragraph with more content.')).toBeInTheDocument();
    expect(screen.getByText('Third paragraph here.')).toBeInTheDocument();
  });

  it('shows author and reading time metadata', () => {
    render(<ReaderModal bookmark={makeBookmark()} {...defaultProps} />);
    expect(screen.getByText('Jane Author')).toBeInTheDocument();
    expect(screen.getByText('2 min read')).toBeInTheDocument();
  });

  it('shows word count in metadata', () => {
    render(<ReaderModal bookmark={makeBookmark()} {...defaultProps} />);
    expect(screen.getByText('500 words')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<ReaderModal bookmark={makeBookmark()} {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close reader/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<ReaderModal bookmark={makeBookmark()} {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows "Mark Done" button when status is reading', () => {
    render(<ReaderModal bookmark={makeBookmark({ status: 'reading' })} {...defaultProps} />);
    expect(screen.getByRole('button', { name: /mark done/i })).toBeInTheDocument();
  });

  it('shows "Start Reading" button when status is unread', () => {
    render(<ReaderModal bookmark={makeBookmark({ status: 'unread' })} {...defaultProps} />);
    expect(screen.getByRole('button', { name: /start reading/i })).toBeInTheDocument();
  });

  it('calls onCycleStatus with done when Mark Done is clicked', () => {
    const onCycleStatus = vi.fn();
    render(
      <ReaderModal
        bookmark={makeBookmark({ status: 'reading' })}
        {...defaultProps}
        onCycleStatus={onCycleStatus}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /mark done/i }));
    expect(onCycleStatus).toHaveBeenCalledWith('bm-1', 'done');
  });

  it('shows Done indicator when status is already done', () => {
    render(<ReaderModal bookmark={makeBookmark({ status: 'done' })} {...defaultProps} />);
    expect(screen.getByText('✓ Done')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mark done/i })).not.toBeInTheDocument();
  });

  it('shows "no content" message when content text is empty', () => {
    render(
      <ReaderModal bookmark={makeBookmark({ content: { word_count: 0 } })} {...defaultProps} />,
    );
    expect(screen.getByText('No extracted content available.')).toBeInTheDocument();
  });

  it('shows a reading progress bar', () => {
    render(<ReaderModal bookmark={makeBookmark()} {...defaultProps} />);
    // Progress bar is present (starts at 0 width)
    const progressBar = document.querySelector('[style*="width:"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<ReaderModal bookmark={makeBookmark()} {...defaultProps} open={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
