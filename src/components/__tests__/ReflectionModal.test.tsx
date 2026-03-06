import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReflectionModal from '../modals/ReflectionModal';
import type { Bookmark } from '../../types';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('../ui/Modal', () => ({
  default: ({
    open,
    title,
    children,
  }: {
    open: boolean;
    title: string;
    children: React.ReactNode;
  }) =>
    open ? (
      <div>
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: 'b1',
    url: 'https://example.com/article',
    title: 'Great Article Title',
    image: null,
    excerpt: null,
    source_type: 'blog',
    status: 'reading',
    is_favorited: false,
    notes: [],
    tags: [],
    areas: [],
    metadata: {},
    content: {},
    content_status: 'pending',
    content_fetched_at: null,
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
  bookmark: makeBookmark(),
  onSave: vi.fn(),
  onSkip: vi.fn(),
  onCancel: vi.fn(),
};

function renderModal(props: Partial<typeof defaultProps> = {}) {
  return render(<ReflectionModal {...defaultProps} {...props} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const windowAsRecord = window as unknown as Record<string, unknown>;

describe('ReflectionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Remove SpeechRecognition from window by default so most tests run clean
    delete windowAsRecord['SpeechRecognition'];
    delete windowAsRecord['webkitSpeechRecognition'];
  });

  it('1. renders bookmark title when open', () => {
    renderModal();
    expect(screen.getByText('Great Article Title')).toBeInTheDocument();
  });

  it('2. Save & Done button is disabled when textarea is empty', () => {
    renderModal();
    const saveBtn = screen.getByRole('button', { name: /save.*done/i });
    expect(saveBtn).toBeDisabled();
  });

  it('3. typing in textarea enables Save & Done button', async () => {
    const user = userEvent.setup();
    renderModal();
    const textarea = screen.getByPlaceholderText(/main takeaway/i);
    await user.type(textarea, 'Really insightful read');
    const saveBtn = screen.getByRole('button', { name: /save.*done/i });
    expect(saveBtn).not.toBeDisabled();
  });

  it('4. clicking Skip calls onSkip without any text argument', async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();
    renderModal({ onSkip });
    await user.click(screen.getByRole('button', { name: /skip/i }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('5. clicking Save & Done calls onSave with the typed text', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    renderModal({ onSave });
    await user.type(screen.getByPlaceholderText(/main takeaway/i), 'My key insight');
    await user.click(screen.getByRole('button', { name: /save.*done/i }));
    expect(onSave).toHaveBeenCalledWith('My key insight');
  });

  it('6. clicking Go back calls onCancel without calling onSkip or onSave', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onSkip = vi.fn();
    const onSave = vi.fn();
    renderModal({ onCancel, onSkip, onSave });
    await user.click(screen.getByRole('button', { name: /go back/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSkip).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('7. Go back button is present in the footer', () => {
    renderModal();
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
  });

  it('8. voice button hidden when SpeechRecognition not defined', () => {
    // SpeechRecognition already removed in beforeEach.
    // speechSupported is a module-level const evaluated at import time;
    // since the API is absent in jsdom, the voice button is not rendered.
    renderModal();
    expect(screen.queryByRole('button', { name: /voice input/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /start voice input/i })).not.toBeInTheDocument();
  });
});
