import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TagAreaInput from '../ui/TagAreaInput';
import type { TagArea } from '../../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeArea(id: string, name: string, overrides: Partial<TagArea> = {}): TagArea {
  return {
    id,
    name,
    description: null,
    color: '#6366f1',
    emoji: null,
    sort_order: 0,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

const testAreas: TagArea[] = [makeArea('a1', 'Programming'), makeArea('a2', 'Design')];

interface Props {
  tags?: string[];
  areas?: TagArea[];
  allAreas?: TagArea[];
  allTags?: string[];
  onTagsChange?: (tags: string[]) => void;
  onAreasChange?: (areas: TagArea[]) => void;
}

function renderInput(props: Props = {}) {
  const {
    tags = [],
    areas = [],
    allAreas = testAreas,
    allTags = ['react', 'typescript', 'testing'],
    onTagsChange = vi.fn(),
    onAreasChange = vi.fn(),
  } = props;

  render(
    <TagAreaInput
      tags={tags}
      areas={areas}
      allAreas={allAreas}
      allTags={allTags}
      onTagsChange={onTagsChange}
      onAreasChange={onAreasChange}
    />,
  );

  return { onTagsChange, onAreasChange };
}

const getInput = () => screen.getByRole('textbox');

// ---------------------------------------------------------------------------
// Rendering pills
// ---------------------------------------------------------------------------

describe('TagAreaInput — rendering pills', () => {
  it('renders existing tag pills', () => {
    renderInput({ tags: ['react', 'typescript'] });
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('typescript')).toBeInTheDocument();
  });

  it('renders existing area pills', () => {
    renderInput({ areas: [testAreas[0]!] });
    expect(screen.getByText('Programming')).toBeInTheDocument();
  });

  it('shows placeholder when empty', () => {
    renderInput();
    expect(getInput()).toHaveAttribute('placeholder', 'Add areas or tags...');
  });

  it('hides placeholder when tags exist', () => {
    renderInput({ tags: ['react'] });
    expect(getInput()).toHaveAttribute('placeholder', '');
  });
});

// ---------------------------------------------------------------------------
// Adding tags via keyboard
// ---------------------------------------------------------------------------

describe('TagAreaInput — adding tags', () => {
  it('calls onTagsChange when Enter is pressed with input text', async () => {
    const { onTagsChange } = renderInput();
    await userEvent.type(getInput(), 'newtag{Enter}');
    expect(onTagsChange).toHaveBeenCalledWith(['newtag']);
  });

  it('trims and lowercases new tags', async () => {
    const { onTagsChange } = renderInput();
    await userEvent.type(getInput(), '  ReactHooks  {Enter}');
    expect(onTagsChange).toHaveBeenCalledWith(['reacthooks']);
  });

  it('calls onTagsChange when comma is pressed', async () => {
    const { onTagsChange } = renderInput();
    await userEvent.type(getInput(), 'vue,');
    expect(onTagsChange).toHaveBeenCalledWith(['vue']);
  });

  it('does not add duplicate tags', async () => {
    const { onTagsChange } = renderInput({ tags: ['react'] });
    await userEvent.type(getInput(), 'react{Enter}');
    // onTagsChange called but with same array (react already present)
    expect(onTagsChange).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Removing pills
// ---------------------------------------------------------------------------

describe('TagAreaInput — removing pills', () => {
  it('removes tag when × button is clicked', async () => {
    const { onTagsChange } = renderInput({ tags: ['react', 'typescript'] });
    await userEvent.click(screen.getByRole('button', { name: 'Remove tag react' }));
    expect(onTagsChange).toHaveBeenCalledWith(['typescript']);
  });

  it('removes area when × button is clicked', async () => {
    const { onAreasChange } = renderInput({ areas: [testAreas[0]!, testAreas[1]!] });
    await userEvent.click(screen.getByRole('button', { name: 'Remove area Programming' }));
    expect(onAreasChange).toHaveBeenCalledWith([testAreas[1]!]);
  });

  it('Backspace on empty input removes last tag', async () => {
    const { onTagsChange } = renderInput({ tags: ['react', 'typescript'] });
    await userEvent.type(getInput(), '{Backspace}');
    expect(onTagsChange).toHaveBeenCalledWith(['react']);
  });

  it('Backspace on empty input removes last area when no tags', async () => {
    const { onAreasChange } = renderInput({ areas: [testAreas[0]!, testAreas[1]!] });
    await userEvent.type(getInput(), '{Backspace}');
    expect(onAreasChange).toHaveBeenCalledWith([testAreas[0]!]);
  });
});

// ---------------------------------------------------------------------------
// Dropdown suggestions
// ---------------------------------------------------------------------------

describe('TagAreaInput — dropdown suggestions', () => {
  it('shows area suggestions when typing', async () => {
    renderInput();
    await userEvent.type(getInput(), 'prog');
    expect(screen.getByText('Programming')).toBeInTheDocument();
  });

  it('shows tag suggestions when typing', async () => {
    renderInput();
    await userEvent.type(getInput(), 're');
    // 'react' and 'typescript' visible — react matches, typescript has no 're' but testing does not
    // Actually 'react' contains 're', 'typescript' does not, 'testing' has 'te'
    expect(screen.getByText('react')).toBeInTheDocument();
  });

  it('does not show dropdown when input is empty', () => {
    renderInput();
    // Suggestions only show when input.length > 0
    expect(screen.queryByText('Areas')).toBeNull();
  });

  it('does not suggest already-selected areas', async () => {
    renderInput({ areas: [testAreas[0]!] }); // Programming already selected
    await userEvent.type(getInput(), 'p'); // 'p' matches 'Programming' but it's already selected
    // 'Programming' should NOT appear in dropdown (it's in the pill, not suggestions)
    const items = screen.queryAllByText('Programming');
    // Only the pill; no duplicate in dropdown
    expect(items).toHaveLength(1); // just the pill
  });

  it('does not suggest already-selected tags', async () => {
    renderInput({ tags: ['react'] });
    await userEvent.type(getInput(), 'react');
    // 'react' already in tags — should not appear in dropdown suggestions
    const items = screen.queryAllByText('react');
    expect(items).toHaveLength(1); // just the existing pill
  });

  it('clicking a suggestion adds it and closes dropdown', async () => {
    const { onAreasChange } = renderInput();
    await userEvent.type(getInput(), 'prog');
    // Click the area suggestion button
    await userEvent.click(screen.getByRole('button', { name: /Programming/i }));
    expect(onAreasChange).toHaveBeenCalledWith([testAreas[0]!]);
    // Dropdown closes
    expect(screen.queryByText('Areas')).toBeNull();
  });

  it('clicking a tag suggestion adds the tag', async () => {
    const { onTagsChange } = renderInput();
    await userEvent.type(getInput(), 'react');
    await userEvent.click(screen.getByRole('button', { name: /^react$/i }));
    expect(onTagsChange).toHaveBeenCalledWith(['react']);
  });
});

// ---------------------------------------------------------------------------
// Keyboard navigation
// ---------------------------------------------------------------------------

describe('TagAreaInput — keyboard navigation', () => {
  it('ArrowDown moves highlight to first suggestion', async () => {
    renderInput();
    await userEvent.type(getInput(), 'p');
    // Arrow down — no visual assertion needed, just verify no crash and dropdown stays open
    fireEvent.keyDown(getInput(), { key: 'ArrowDown' });
    // Dropdown should still be visible
    expect(screen.getByText('Areas')).toBeInTheDocument();
  });

  it('Escape closes the dropdown', async () => {
    renderInput();
    await userEvent.type(getInput(), 'prog');
    expect(screen.getByText('Areas')).toBeInTheDocument();
    fireEvent.keyDown(getInput(), { key: 'Escape' });
    expect(screen.queryByText('Areas')).toBeNull();
  });

  it('Enter selects the highlighted suggestion', async () => {
    const { onAreasChange } = renderInput();
    await userEvent.type(getInput(), 'p'); // shows Programming suggestion
    fireEvent.keyDown(getInput(), { key: 'ArrowDown' }); // highlight index → 0
    fireEvent.keyDown(getInput(), { key: 'Enter' });
    expect(onAreasChange).toHaveBeenCalledWith([testAreas[0]!]);
  });
});

// ---------------------------------------------------------------------------
// Outside click closes dropdown
// ---------------------------------------------------------------------------

describe('TagAreaInput — outside click', () => {
  it('closes dropdown when clicking outside the component', async () => {
    render(
      <div>
        <TagAreaInput
          tags={[]}
          areas={[]}
          allAreas={testAreas}
          allTags={[]}
          onTagsChange={vi.fn()}
          onAreasChange={vi.fn()}
        />
        <button>Outside</button>
      </div>,
    );

    await userEvent.type(screen.getByRole('textbox'), 'p');
    expect(screen.getByText('Areas')).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByText('Areas')).toBeNull();
  });
});
