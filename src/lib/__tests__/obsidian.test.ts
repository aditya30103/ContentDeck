import { describe, it, expect } from 'vitest';
import { generateMarkdown } from '../obsidian';
import type { Bookmark } from '../../types';

function makeBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: 'test-id',
    url: 'https://example.com/article',
    title: 'Test Article',
    image: null,
    excerpt: null,
    source_type: 'blog',
    status: 'unread',
    is_favorited: false,
    notes: [],
    tags: [],
    areas: [],
    metadata: {},
    content: {},
    content_status: 'pending',
    content_fetched_at: null,
    synced: false,
    created_at: '2024-01-15T10:00:00Z',
    status_changed_at: '2024-01-15T10:00:00Z',
    started_reading_at: null,
    finished_at: null,
    ...overrides,
  };
}

describe('generateMarkdown — standard bookmark', () => {
  it('includes url in frontmatter', () => {
    const md = generateMarkdown(makeBookmark());
    expect(md).toContain('url: "https://example.com/article"');
  });

  it('includes Open original link', () => {
    const md = generateMarkdown(makeBookmark());
    expect(md).toContain('> [Open original](https://example.com/article)');
    expect(md).toContain('example.com');
  });

  it('includes author in frontmatter when present', () => {
    const md = generateMarkdown(makeBookmark({ metadata: { author: 'Jane Smith' } }));
    expect(md).toContain('author: "Jane Smith"');
  });

  it('includes channel in frontmatter for YouTube', () => {
    const md = generateMarkdown(
      makeBookmark({
        url: 'https://youtube.com/watch?v=abc',
        source_type: 'youtube',
        metadata: { channel: 'Tech Channel', duration: '10:30' },
      }),
    );
    expect(md).toContain('channel: "Tech Channel"');
  });
});

describe('generateMarkdown — book without URL', () => {
  const bookNoUrl = makeBookmark({
    url: 'book://no-url',
    title: 'Deep Work',
    source_type: 'book',
    metadata: { author: 'Cal Newport' },
  });

  it('omits sentinel URL from frontmatter', () => {
    const md = generateMarkdown(bookNoUrl);
    expect(md).not.toContain('book://no-url');
  });

  it('omits Open original link', () => {
    const md = generateMarkdown(bookNoUrl);
    expect(md).not.toContain('Open original');
  });

  it('includes title as heading', () => {
    const md = generateMarkdown(bookNoUrl);
    expect(md).toContain('# Deep Work');
  });

  it('includes author in frontmatter', () => {
    const md = generateMarkdown(bookNoUrl);
    expect(md).toContain('author: "Cal Newport"');
  });

  it('uses Untitled Book fallback when no title', () => {
    const md = generateMarkdown(
      makeBookmark({ url: 'book://no-url', title: null, source_type: 'book' }),
    );
    expect(md).toContain('# Untitled Book');
  });
});

describe('generateMarkdown — wikilink tags', () => {
  it('renders single tag as Obsidian wikilink', () => {
    const md = generateMarkdown(makeBookmark({ tags: ['javascript'] }));
    expect(md).toContain('tags: ["[[javascript]]"]');
  });

  it('renders multiple tags as wikilinks', () => {
    const md = generateMarkdown(makeBookmark({ tags: ['react', 'typescript'] }));
    expect(md).toContain('tags: ["[[react]]", "[[typescript]]"]');
  });

  it('escapes special chars inside wikilinks', () => {
    const md = generateMarkdown(makeBookmark({ tags: ['c++', 'node"js'] }));
    expect(md).toContain('"[[c++]]"');
    expect(md).toContain('"[[node\\"js]]"');
  });

  it('omits tags line when tags array is empty', () => {
    const md = generateMarkdown(makeBookmark({ tags: [] }));
    expect(md).not.toContain('tags:');
  });
});

describe('generateMarkdown — areas and content_deck_id', () => {
  it('includes content_deck_id in frontmatter', () => {
    const md = generateMarkdown(makeBookmark({ id: 'abc-123' }));
    expect(md).toContain('content_deck_id: "abc-123"');
  });

  it('renders areas as Obsidian wikilinks', () => {
    const md = generateMarkdown(
      makeBookmark({
        areas: [
          {
            id: 'a1',
            name: 'AI',
            description: null,
            color: null,
            emoji: null,
            sort_order: 0,
            created_at: '2024-01-01T00:00:00Z',
          },
          {
            id: 'a2',
            name: 'Product',
            description: null,
            color: null,
            emoji: null,
            sort_order: 1,
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
      }),
    );
    expect(md).toContain('areas: ["[[AI]]", "[[Product]]"]');
  });

  it('omits areas line when areas array is empty', () => {
    const md = generateMarkdown(makeBookmark({ areas: [] }));
    expect(md).not.toContain('areas:');
  });
});

describe('generateMarkdown — reflection notes', () => {
  it('renders reflection note under ## Reflection section', () => {
    const md = generateMarkdown(
      makeBookmark({
        notes: [
          { type: 'reflection', content: 'Key takeaway here', created_at: '2024-01-15T10:00:00Z' },
        ],
      }),
    );
    expect(md).toContain('## Reflection');
    expect(md).toContain('Key takeaway here');
  });

  it('does not include reflection note under ## Notes section', () => {
    const md = generateMarkdown(
      makeBookmark({
        notes: [
          { type: 'reflection', content: 'My reflection', created_at: '2024-01-15T10:00:00Z' },
        ],
      }),
    );
    expect(md).not.toContain('## Notes');
  });

  it('renders regular and reflection notes in separate sections', () => {
    const md = generateMarkdown(
      makeBookmark({
        notes: [
          { type: 'insight', content: 'An insight', created_at: '2024-01-15T10:00:00Z' },
          { type: 'reflection', content: 'A reflection', created_at: '2024-01-15T11:00:00Z' },
        ],
      }),
    );
    expect(md).toContain('## Notes');
    expect(md).toContain('An insight');
    expect(md).toContain('## Reflection');
    expect(md).toContain('A reflection');
    // Reflection section comes after Notes section
    expect(md.indexOf('## Reflection')).toBeGreaterThan(md.indexOf('## Notes'));
  });
});

describe('generateMarkdown — arXiv abstract', () => {
  it('uses ## Abstract header for arXiv source type', () => {
    const md = generateMarkdown(
      makeBookmark({
        source_type: 'arxiv',
        excerpt: 'Short excerpt',
        metadata: { abstract: 'Full abstract text here' },
      }),
    );
    expect(md).toContain('## Abstract');
    expect(md).not.toContain('## Summary');
  });

  it('uses full abstract text (not excerpt) for arXiv', () => {
    const md = generateMarkdown(
      makeBookmark({
        source_type: 'arxiv',
        excerpt: 'Short excerpt',
        metadata: { abstract: 'Full abstract text here' },
      }),
    );
    expect(md).toContain('Full abstract text here');
    expect(md).not.toContain('Short excerpt');
  });

  it('falls back to excerpt for arXiv when no abstract in metadata', () => {
    const md = generateMarkdown(
      makeBookmark({
        source_type: 'arxiv',
        excerpt: 'Fallback excerpt',
        metadata: {},
      }),
    );
    expect(md).toContain('## Abstract');
    expect(md).toContain('Fallback excerpt');
  });

  it('uses ## Summary header for non-arXiv source types', () => {
    const md = generateMarkdown(makeBookmark({ source_type: 'blog', excerpt: 'Blog excerpt' }));
    expect(md).toContain('## Summary');
    expect(md).not.toContain('## Abstract');
  });
});
