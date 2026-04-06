import { describe, it, expect } from 'vitest';
import {
  detectSourceType,
  timeAgo,
  localDateString,
  truncate,
  getDomain,
  formatDate,
  getFaviconUrl,
  isBookWithoutUrl,
} from '../utils';

describe('detectSourceType', () => {
  it('detects youtube.com', () => {
    expect(detectSourceType('https://www.youtube.com/watch?v=abc123')).toBe('youtube');
  });

  it('detects youtu.be', () => {
    expect(detectSourceType('https://youtu.be/abc123')).toBe('youtube');
  });

  it('detects youtube.app.goo.gl', () => {
    expect(detectSourceType('https://youtube.app.goo.gl/abc123')).toBe('youtube');
  });

  it('detects twitter.com', () => {
    expect(detectSourceType('https://twitter.com/user/status/123')).toBe('twitter');
  });

  it('detects x.com', () => {
    expect(detectSourceType('https://x.com/user/status/123')).toBe('twitter');
  });

  it('detects t.co', () => {
    expect(detectSourceType('https://t.co/abc123')).toBe('twitter');
  });

  it('detects linkedin.com', () => {
    expect(detectSourceType('https://www.linkedin.com/posts/user')).toBe('linkedin');
  });

  it('detects lnkd.in', () => {
    expect(detectSourceType('https://lnkd.in/abc123')).toBe('linkedin');
  });

  it('detects substack.com', () => {
    expect(detectSourceType('https://example.substack.com/p/title')).toBe('substack');
  });

  it('detects arxiv.org/abs/', () => {
    expect(detectSourceType('https://arxiv.org/abs/2301.00001')).toBe('arxiv');
  });

  it('detects arxiv.org/pdf/', () => {
    expect(detectSourceType('https://arxiv.org/pdf/1706.03762v5')).toBe('arxiv');
  });

  it('returns blog for generic URLs', () => {
    expect(detectSourceType('https://example.com/article')).toBe('blog');
  });

  it('is case-insensitive', () => {
    expect(detectSourceType('https://WWW.YOUTUBE.COM/watch?v=abc')).toBe('youtube');
  });
});

describe('timeAgo', () => {
  it('returns "just now" for recent dates', () => {
    const now = new Date().toISOString();
    expect(timeAgo(now)).toBe('just now');
  });

  it('returns minutes ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(timeAgo(fiveMinAgo)).toBe('5m ago');
  });

  it('returns hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(threeHoursAgo)).toBe('3h ago');
  });

  it('returns days ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(twoDaysAgo)).toBe('2d ago');
  });

  it('returns months ago', () => {
    const twoMonthsAgo = new Date(Date.now() - 65 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(twoMonthsAgo)).toBe('2mo ago');
  });

  it('returns years ago', () => {
    const twoYearsAgo = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(twoYearsAgo)).toBe('2y ago');
  });
});

describe('localDateString', () => {
  it('returns YYYY-MM-DD format', () => {
    const result = localDateString(new Date(2024, 0, 15)); // Jan 15, 2024
    expect(result).toBe('2024-01-15');
  });

  it('pads single-digit months and days', () => {
    const result = localDateString(new Date(2024, 2, 5)); // Mar 5, 2024
    expect(result).toBe('2024-03-05');
  });

  it('defaults to today', () => {
    const result = localDateString();
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(result).toBe(expected);
  });
});

describe('formatDate', () => {
  it('returns a human-readable date', () => {
    const result = formatDate('2024-01-15T12:00:00Z');
    // Locale-dependent but should contain year, month, day
    expect(result).toContain('2024');
    expect(result).toContain('15');
  });
});

describe('truncate', () => {
  it('returns text unchanged when within limit', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('returns text unchanged when exactly at limit', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  it('truncates and adds ellipsis when over limit', () => {
    expect(truncate('hello world', 5)).toBe('hello...');
  });

  it('trims trailing whitespace before ellipsis', () => {
    expect(truncate('hello world test', 6)).toBe('hello...');
  });
});

describe('getDomain', () => {
  it('extracts domain from URL', () => {
    expect(getDomain('https://example.com/path')).toBe('example.com');
  });

  it('strips www prefix', () => {
    expect(getDomain('https://www.example.com/path')).toBe('example.com');
  });

  it('preserves subdomains other than www', () => {
    expect(getDomain('https://blog.example.com/path')).toBe('blog.example.com');
  });

  it('returns original string for invalid URLs', () => {
    expect(getDomain('not-a-url')).toBe('not-a-url');
  });
});

describe('isBookWithoutUrl', () => {
  it('returns true for a book with sentinel URL', () => {
    expect(isBookWithoutUrl({ source_type: 'book', url: 'book://no-url' })).toBe(true);
  });

  it('returns false for a book with a real https URL', () => {
    expect(isBookWithoutUrl({ source_type: 'book', url: 'https://amazon.com/book' })).toBe(false);
  });

  it('returns false for a non-book source with any URL', () => {
    expect(isBookWithoutUrl({ source_type: 'blog', url: 'book://no-url' })).toBe(false);
  });

  it('returns false for non-book with https URL', () => {
    expect(isBookWithoutUrl({ source_type: 'youtube', url: 'https://youtube.com' })).toBe(false);
  });

  it('returns true for book with any non-http URL (e.g. empty protocol)', () => {
    expect(isBookWithoutUrl({ source_type: 'book', url: 'no-url-at-all' })).toBe(true);
  });
});

describe('getFaviconUrl', () => {
  it('returns Google Favicon API URL with the domain', () => {
    const result = getFaviconUrl('https://example.com/article');
    expect(result).toBe('https://www.google.com/s2/favicons?domain=example.com&sz=32');
  });

  it('strips www from domain in favicon URL', () => {
    const result = getFaviconUrl('https://www.github.com');
    expect(result).toBe('https://www.google.com/s2/favicons?domain=github.com&sz=32');
  });
});

describe('timeAgo — edge cases', () => {
  it('returns "just now" for a future date (negative seconds)', () => {
    const futureDate = new Date(Date.now() + 10_000).toISOString();
    expect(timeAgo(futureDate)).toBe('just now');
  });

  it('returns "1m ago" for exactly 60 seconds', () => {
    const sixtySecondsAgo = new Date(Date.now() - 60_000).toISOString();
    expect(timeAgo(sixtySecondsAgo)).toBe('1m ago');
  });

  it('returns "just now" for 59 seconds ago', () => {
    const fiftyNineSecondsAgo = new Date(Date.now() - 59_000).toISOString();
    expect(timeAgo(fiftyNineSecondsAgo)).toBe('just now');
  });
});
