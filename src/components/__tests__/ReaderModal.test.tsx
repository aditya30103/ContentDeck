import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

  it('renders extracted content as separate paragraphs (text fallback path)', () => {
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

  it('renders the dialog when mounted', () => {
    render(<ReaderModal bookmark={makeBookmark()} {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  // ---- Phase 1 pipeline-rebuild coverage ----

  it('renders content.html via prose when present, preferring it over content.text', () => {
    const bookmark = makeBookmark({
      content: {
        html: '<h2>A Heading</h2><p>A paragraph.</p><pre><code>const x = 1;</code></pre>',
        text: 'This text must not appear when html is present.',
        word_count: 500,
        reading_time: 2,
        author: 'Jane Author',
      },
    });
    render(<ReaderModal bookmark={bookmark} {...defaultProps} />);
    expect(screen.getByText('A Heading')).toBeInTheDocument();
    expect(screen.getByText('A paragraph.')).toBeInTheDocument();
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
    expect(
      screen.queryByText('This text must not appear when html is present.'),
    ).not.toBeInTheDocument();
  });

  it('applies .prose and .prose-reader classes so typography + theme vars engage', () => {
    const bookmark = makeBookmark({
      content: { html: '<p>x</p>', word_count: 10 },
    });
    const { container } = render(<ReaderModal bookmark={bookmark} {...defaultProps} />);
    const proseDiv = container.querySelector('.prose.prose-reader');
    expect(proseDiv).toBeInTheDocument();
  });

  it('strips <script> tags from content.html via client-side DOMPurify', () => {
    const bookmark = makeBookmark({
      content: {
        html: '<p>safe text</p><script>window.pwned = true;</script>',
        word_count: 10,
      },
    });
    const { container } = render(<ReaderModal bookmark={bookmark} {...defaultProps} />);
    expect(screen.getByText('safe text')).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
  });

  it('rewrites anchors to open in a new tab with noopener/noreferrer', () => {
    const bookmark = makeBookmark({
      content: {
        html: '<p>See <a href="https://example.org">link</a></p>',
        word_count: 10,
      },
    });
    const { container } = render(<ReaderModal bookmark={bookmark} {...defaultProps} />);
    const anchor = container.querySelector('a[href="https://example.org"]');
    expect(anchor).toBeInTheDocument();
    expect(anchor?.getAttribute('target')).toBe('_blank');
    expect(anchor?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('marks images as lazy-loaded', () => {
    const bookmark = makeBookmark({
      content: {
        html: '<p><img src="https://example.org/x.png" alt="x" /></p>',
        word_count: 10,
      },
    });
    const { container } = render(<ReaderModal bookmark={bookmark} {...defaultProps} />);
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img?.getAttribute('loading')).toBe('lazy');
    expect(img?.getAttribute('decoding')).toBe('async');
  });

  it('renders data-reader-theme attribute so CSS theme variables engage', () => {
    const bookmark = makeBookmark();
    const { container } = render(<ReaderModal bookmark={bookmark} {...defaultProps} />);
    const dialog = container.querySelector('[data-reader-theme]');
    expect(dialog).toBeInTheDocument();
    expect(dialog?.getAttribute('data-reader-theme')).toBe('light');
  });

  // ---- Phase 2 reliability coverage ----

  it('shows extracting state when content_status is "extracting"', () => {
    const bookmark = makeBookmark({ content_status: 'extracting', content: {} });
    render(<ReaderModal bookmark={bookmark} {...defaultProps} />);
    expect(screen.getByText(/extracting content/i)).toBeInTheDocument();
  });

  it('shows failed state with Retry and Open original when content_status is "failed"', () => {
    const bookmark = makeBookmark({ content_status: 'failed', content: {} });
    const onRetryExtraction = vi.fn().mockResolvedValue(undefined);
    render(
      <ReaderModal bookmark={bookmark} {...defaultProps} onRetryExtraction={onRetryExtraction} />,
    );
    expect(screen.getByText(/could not extract this article/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry extraction/i })).toBeInTheDocument();
    const openOriginal = screen.getByRole('link', { name: /open original/i });
    expect(openOriginal).toHaveAttribute('href', 'https://example.com/article');
    expect(openOriginal).toHaveAttribute('target', '_blank');
    expect(openOriginal).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('calls onRetryExtraction when Retry is clicked on failed state', async () => {
    const bookmark = makeBookmark({ content_status: 'failed', content: {} });
    const onRetryExtraction = vi.fn().mockResolvedValue(undefined);
    render(
      <ReaderModal bookmark={bookmark} {...defaultProps} onRetryExtraction={onRetryExtraction} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /retry extraction/i }));
    await waitFor(() => expect(onRetryExtraction).toHaveBeenCalledTimes(1));
    expect(onRetryExtraction).toHaveBeenCalledWith(bookmark);
  });

  it('hides Retry button when onRetryExtraction prop is absent', () => {
    const bookmark = makeBookmark({ content_status: 'failed', content: {} });
    render(<ReaderModal bookmark={bookmark} {...defaultProps} />);
    expect(screen.queryByRole('button', { name: /retry extraction/i })).not.toBeInTheDocument();
    // Open original remains so the user has an escape hatch.
    expect(screen.getByRole('link', { name: /open original/i })).toBeInTheDocument();
  });

  it('shows partial-extraction banner when content_status is "partial"', () => {
    const bookmark = makeBookmark({
      content_status: 'partial',
      content: { text: 'Only excerpt available.', word_count: 50 },
    });
    render(<ReaderModal bookmark={bookmark} {...defaultProps} />);
    expect(screen.getByText(/full article could not be extracted/i)).toBeInTheDocument();
    // Still renders the excerpt body
    expect(screen.getByText('Only excerpt available.')).toBeInTheDocument();
  });

  it('shows truncation notice when content.truncated is true', () => {
    const bookmark = makeBookmark({
      content: {
        text: 'Some text content.',
        truncated: true,
        word_count: 100,
      },
    });
    render(<ReaderModal bookmark={bookmark} {...defaultProps} />);
    expect(screen.getByText(/article was truncated/i)).toBeInTheDocument();
  });

  it('does not show truncation notice when content.truncated is false', () => {
    const bookmark = makeBookmark({
      content: { text: 'Some text content.', truncated: false, word_count: 100 },
    });
    render(<ReaderModal bookmark={bookmark} {...defaultProps} />);
    expect(screen.queryByText(/article was truncated/i)).not.toBeInTheDocument();
  });

  it('shows Resume pill when prior reading progress > threshold is stored', () => {
    localStorageStore['reader_progress:bm-1'] = '0.42';
    const bookmark = makeBookmark();
    render(<ReaderModal bookmark={bookmark} {...defaultProps} />);
    expect(screen.getByRole('button', { name: /resume from 42 percent/i })).toBeInTheDocument();
    delete localStorageStore['reader_progress:bm-1'];
  });

  it('does not show Resume pill when prior progress is below threshold', () => {
    localStorageStore['reader_progress:bm-1'] = '0.02';
    const bookmark = makeBookmark();
    render(<ReaderModal bookmark={bookmark} {...defaultProps} />);
    expect(screen.queryByRole('button', { name: /resume from/i })).not.toBeInTheDocument();
    delete localStorageStore['reader_progress:bm-1'];
  });
});
