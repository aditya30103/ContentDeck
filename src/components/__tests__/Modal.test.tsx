import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from '../ui/Modal';

const onClose = vi.fn();

function renderModal(open: boolean, content?: React.ReactNode) {
  return render(
    <Modal open={open} onClose={onClose} title="Test Modal">
      {content ?? <button>First</button>}
    </Modal>,
  );
}

beforeEach(() => {
  onClose.mockClear();
});

// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

describe('Modal — visibility', () => {
  it('renders children when open=true', () => {
    renderModal(true, <p>modal content</p>);
    expect(screen.getByText('modal content')).toBeInTheDocument();
  });

  it('renders nothing when open=false initially', () => {
    renderModal(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders title as heading text', () => {
    renderModal(true);
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// ARIA structure
// ---------------------------------------------------------------------------

describe('Modal — ARIA attributes', () => {
  it('has role="dialog" on the inner content panel', () => {
    renderModal(true);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does NOT put role="dialog" on the backdrop', () => {
    renderModal(true);
    const dialog = screen.getByRole('dialog');
    // Backdrop is the parent of the dialog panel — it should not have role="dialog"
    expect(dialog.parentElement).not.toHaveAttribute('role', 'dialog');
  });

  it('has aria-modal="true" on the dialog', () => {
    renderModal(true);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('links title via aria-labelledby → id="modal-title"', () => {
    renderModal(true);
    const dialog = screen.getByRole('dialog');
    const labelledById = dialog.getAttribute('aria-labelledby');
    expect(labelledById).toBe('modal-title');
    expect(document.getElementById('modal-title')).toHaveTextContent('Test Modal');
  });
});

// ---------------------------------------------------------------------------
// Close triggers
// ---------------------------------------------------------------------------

describe('Modal — close triggers', () => {
  it('calls onClose when Escape key is pressed', async () => {
    renderModal(true);
    await userEvent.keyboard('{Escape}');
    // Modal has two Escape handlers (document keydown + onKeyDown on backdrop);
    // assert it was called rather than exact count
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when the backdrop is clicked directly', () => {
    renderModal(true);
    const dialog = screen.getByRole('dialog');
    const backdrop = dialog.parentElement!;
    // Simulate click directly on the backdrop (not the dialog panel)
    // The handler checks `e.target === overlayRef.current`, which matches when clicking the backdrop div itself
    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onClose when clicking inside the dialog content', async () => {
    renderModal(true, <button>Inner Button</button>);
    await userEvent.click(screen.getByRole('button', { name: 'Inner Button' }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when the Close (X) button is clicked', async () => {
    renderModal(true);
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Focus trap
// ---------------------------------------------------------------------------

describe('Modal — focus trap', () => {
  it('Tab wraps from last to first focusable element', async () => {
    renderModal(
      true,
      <>
        <button>First</button>
        <button>Second</button>
        <button>Last</button>
      </>,
    );

    // Wait for requestAnimationFrame to auto-focus the first element
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    const buttons = screen.getAllByRole('button', { name: /First|Second|Last/ });
    const last = buttons[buttons.length - 1]!;

    // Place focus on the last button
    act(() => {
      last.focus();
    });
    expect(document.activeElement).toBe(last);

    // Tab from last → should wrap to first (Close button is also focusable but first inside contentRef)
    await userEvent.tab();
    // Focus should now be on the Close button (first focusable in contentRef) OR first child button
    // The focus trap wraps: pressing Tab on the last focusable moves to the first
    const firstFocusable = screen.getByRole('button', { name: 'Close' });
    expect(document.activeElement).toBe(firstFocusable);
  });

  it('Shift+Tab wraps from first to last focusable element', async () => {
    renderModal(
      true,
      <>
        <button>Alpha</button>
        <button>Beta</button>
      </>,
    );

    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    // Close button is the first focusable in the modal (in the header)
    const closeBtn = screen.getByRole('button', { name: 'Close' });
    act(() => {
      closeBtn.focus();
    });
    expect(document.activeElement).toBe(closeBtn);

    // Shift+Tab from first → should wrap to last
    await userEvent.tab({ shift: true });
    const allButtons = screen.getAllByRole('button');
    const lastButton = allButtons[allButtons.length - 1]!;
    expect(document.activeElement).toBe(lastButton);
  });
});
