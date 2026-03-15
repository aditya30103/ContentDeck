import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MobileHeader from '../layout/MobileHeader';

const defaultProps = {
  onAdd: vi.fn(),
  onToggleSearch: vi.fn(),
  onSettings: vi.fn(),
  showSearch: false,
};

describe('MobileHeader', () => {
  it('renders title and exactly 3 action buttons', () => {
    render(<MobileHeader {...defaultProps} />);
    expect(screen.getByText('ContentDeck')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add bookmark/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /statistics/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /feedback/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /theme/i })).not.toBeInTheDocument();
  });
});
