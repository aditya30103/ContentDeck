import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import Modal from '../ui/Modal';

// Mock framer-motion — use plain forwardRef divs so tests run without animation environment
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
      (props, ref) => {
        // Strip framer-specific props that aren't valid HTML attributes
        const {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          children,
          ...divProps
        } = props;
        return (
          // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- mock only; keyboard users have ESC via document handler
          <div ref={ref} {...divProps}>
            {children}
          </div>
        );
      },
    ),
  },
}));

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  title: 'Test Modal',
  children: <div>Content</div>,
};

describe('Modal', () => {
  it('renders content when open', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<Modal {...defaultProps} open={false} />);
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
  });

  it('calls onClose when X button is clicked', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);
    const closeButton = screen.getByRole('button', { name: /close/i });
    closeButton.click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
