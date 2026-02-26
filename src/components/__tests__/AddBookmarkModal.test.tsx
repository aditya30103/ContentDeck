import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddBookmarkModal from '../modals/AddBookmarkModal';

// Mock TagAreaInput as a simple stub — full autocomplete is tested separately
vi.mock('../ui/TagAreaInput', () => ({
  default: () => <div data-testid="tag-area-input" />,
}));

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  onAdd: vi.fn(),
  isPending: false,
  allAreas: [],
  allTags: [],
};

describe('AddBookmarkModal', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(<AddBookmarkModal {...defaultProps} open={false} />);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders form when open is true', () => {
    render(<AddBookmarkModal {...defaultProps} />);
    expect(screen.getByLabelText('URL')).toBeInTheDocument();
    expect(screen.getByText('Save Bookmark')).toBeInTheDocument();
  });

  it('detects YouTube source type when URL is entered', async () => {
    const user = userEvent.setup();
    render(<AddBookmarkModal {...defaultProps} />);
    await user.type(screen.getByLabelText('URL'), 'https://youtube.com/watch?v=abc');
    expect(screen.getByText('YouTube')).toBeInTheDocument();
  });

  it('submit button is disabled when URL is empty', () => {
    render(<AddBookmarkModal {...defaultProps} />);
    expect(screen.getByText('Save Bookmark').closest('button')).toBeDisabled();
  });

  it('submit button shows Saving... when isPending', () => {
    render(<AddBookmarkModal {...defaultProps} isPending={true} />);
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('calls onAdd with correct payload on submit', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<AddBookmarkModal {...defaultProps} onAdd={onAdd} />);
    await user.type(screen.getByLabelText('URL'), 'https://example.com/article');
    await user.type(screen.getByLabelText(/Title/), 'Test Article');
    await user.click(screen.getByText('Save Bookmark'));
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://example.com/article',
        title: 'Test Article',
      }),
    );
  });

  it('pre-fills URL from initialUrl prop', () => {
    render(<AddBookmarkModal {...defaultProps} initialUrl="https://twitter.com/user/status/1" />);
    expect(screen.getByLabelText('URL')).toHaveValue('https://twitter.com/user/status/1');
    expect(screen.getByText('Twitter')).toBeInTheDocument();
  });
});

describe('AddBookmarkModal — book mode', () => {
  it('shows book mode toggle button', () => {
    render(<AddBookmarkModal {...defaultProps} />);
    expect(screen.getByText('Log a book without a URL')).toBeInTheDocument();
  });

  it('enters book mode when toggle is clicked', async () => {
    const user = userEvent.setup();
    render(<AddBookmarkModal {...defaultProps} />);
    await user.click(screen.getByText('Log a book without a URL'));
    expect(screen.getByText('Logging a book (no URL needed)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Book title')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Author name')).toBeInTheDocument();
    expect(screen.getByText('Log Book')).toBeInTheDocument();
  });

  it('submit button enabled when title is filled (book mode, no URL)', async () => {
    const user = userEvent.setup();
    render(<AddBookmarkModal {...defaultProps} />);
    await user.click(screen.getByText('Log a book without a URL'));
    expect(screen.getByText('Log Book').closest('button')).toBeDisabled();
    await user.type(screen.getByPlaceholderText('Book title'), 'Atomic Habits');
    expect(screen.getByText('Log Book').closest('button')).not.toBeDisabled();
  });

  it('calls onAdd with source_type book and no url when no URL is entered', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<AddBookmarkModal {...defaultProps} onAdd={onAdd} />);
    await user.click(screen.getByText('Log a book without a URL'));
    await user.type(screen.getByPlaceholderText('Book title'), 'Deep Work');
    await user.type(screen.getByPlaceholderText('Author name'), 'Cal Newport');
    await user.click(screen.getByText('Log Book'));
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Deep Work',
        source_type: 'book',
        metadata: { author: 'Cal Newport' },
      }),
    );
    const call = onAdd.mock.calls[0]?.[0] as { url?: string };
    expect(call.url).toBeUndefined();
  });

  it('calls onAdd with url when URL is provided in book mode', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<AddBookmarkModal {...defaultProps} onAdd={onAdd} />);
    await user.click(screen.getByText('Log a book without a URL'));
    await user.type(
      screen.getByPlaceholderText('https://... (optional)'),
      'https://books.example.com/atomic-habits',
    );
    await user.type(screen.getByPlaceholderText('Book title'), 'Atomic Habits');
    await user.click(screen.getByText('Log Book'));
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://books.example.com/atomic-habits',
        title: 'Atomic Habits',
        source_type: 'book',
      }),
    );
  });

  it('omits metadata when no author is entered in book mode', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<AddBookmarkModal {...defaultProps} onAdd={onAdd} />);
    await user.click(screen.getByText('Log a book without a URL'));
    await user.type(screen.getByPlaceholderText('Book title'), 'No Author Book');
    await user.click(screen.getByText('Log Book'));
    const call = onAdd.mock.calls[0]?.[0] as { metadata?: unknown };
    expect(call.metadata).toBeUndefined();
  });
});
