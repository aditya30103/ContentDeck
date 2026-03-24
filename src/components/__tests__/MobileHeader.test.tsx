import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MobileHeader from '../layout/MobileHeader';

const noop = vi.fn();

const defaultProps = {
  onAdd: noop,
  onToggleSearch: noop,
  onSettings: noop,
  showSearch: false,
};

describe('MobileHeader', () => {
  it('renders exactly 3 action buttons', () => {
    render(<MobileHeader {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });

  it('renders Search, Settings, and Add bookmark buttons', () => {
    render(<MobileHeader {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add bookmark' })).toBeInTheDocument();
  });

  it('does not render Stats, Feedback, or Theme buttons', () => {
    render(<MobileHeader {...defaultProps} />);
    expect(screen.queryByRole('button', { name: /statistic/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /feedback/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /theme/i })).not.toBeInTheDocument();
  });

  it('calls onToggleSearch when Search is clicked', () => {
    const onToggleSearch = vi.fn();
    render(<MobileHeader {...defaultProps} onToggleSearch={onToggleSearch} />);
    screen.getByRole('button', { name: 'Search' }).click();
    expect(onToggleSearch).toHaveBeenCalledOnce();
  });

  it('calls onSettings when Settings is clicked', () => {
    const onSettings = vi.fn();
    render(<MobileHeader {...defaultProps} onSettings={onSettings} />);
    screen.getByRole('button', { name: 'Settings' }).click();
    expect(onSettings).toHaveBeenCalledOnce();
  });

  it('calls onAdd when Add bookmark is clicked', () => {
    const onAdd = vi.fn();
    render(<MobileHeader {...defaultProps} onAdd={onAdd} />);
    screen.getByRole('button', { name: 'Add bookmark' }).click();
    expect(onAdd).toHaveBeenCalledOnce();
  });

  it('shows ContentDeck title', () => {
    render(<MobileHeader {...defaultProps} />);
    expect(screen.getByText('ContentDeck')).toBeInTheDocument();
  });
});
