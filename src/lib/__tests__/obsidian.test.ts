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
