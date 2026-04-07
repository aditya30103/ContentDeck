import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchMetadata } from '../metadata';

// vi.mock is hoisted to the top of the file by Vitest, so mockInvoke must be
// declared via vi.hoisted() to be accessible inside the mock factory.
const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }));
vi.mock('../supabase', () => ({
  supabase: { functions: { invoke: mockInvoke } },
}));

const mockFetch = vi.mocked(fetch);

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as Response;
}

describe('fetchMetadata — YouTube', () => {
  beforeEach(() => {
    // Set YouTube API key so Data API path is attempted
    localStorage.setItem('youtube_api_key', 'test-key');
  });

  it('returns title, thumbnail, duration from Data API', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        items: [
          {
            snippet: {
              title: 'Test Video',
              channelTitle: 'Test Channel',
              description: 'A description',
              thumbnails: { high: { url: 'https://img.youtube.com/high.jpg' } },
            },
            contentDetails: { duration: 'PT1H2M3S' },
          },
        ],
      }),
    );

    const result = await fetchMetadata('https://www.youtube.com/watch?v=abc123', 'youtube');

    expect(result.title).toBe('Test Video');
    expect(result.image).toBe('https://img.youtube.com/high.jpg');
    expect(result.metadata?.channel).toBe('Test Channel');
    expect(result.metadata?.duration).toBe('1:02:03');
  });

  it('falls back to oEmbed when Data API fails', async () => {
    // Data API fails
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 500));
    // oEmbed succeeds
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        title: 'Fallback Title',
        thumbnail_url: 'https://img.youtube.com/fallback.jpg',
        author_name: 'Fallback Channel',
      }),
    );

    const result = await fetchMetadata('https://www.youtube.com/watch?v=abc123', 'youtube');

    expect(result.title).toBe('Fallback Title');
    expect(result.metadata?.channel).toBe('Fallback Channel');
  });

  it('returns empty when both APIs fail', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 500));
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 404));

    const result = await fetchMetadata('https://www.youtube.com/watch?v=abc123', 'youtube');

    expect(result).toEqual({});
  });

  it('skips Data API when no API key is set', async () => {
    localStorage.removeItem('youtube_api_key');
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        title: 'oEmbed Only',
        thumbnail_url: 'https://img.youtube.com/oembed.jpg',
        author_name: 'Channel',
      }),
    );

    const result = await fetchMetadata('https://youtu.be/abc123', 'youtube');

    expect(result.title).toBe('oEmbed Only');
    // Should have only called oEmbed, not Data API — verify via URL
    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('oembed');
    expect(calledUrl).not.toContain('googleapis');
  });

  it('parses duration with minutes and seconds only', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        items: [
          {
            snippet: {
              title: 'Short Video',
              channelTitle: 'Ch',
              thumbnails: { medium: { url: 'https://img.youtube.com/med.jpg' } },
            },
            contentDetails: { duration: 'PT5M30S' },
          },
        ],
      }),
    );

    const result = await fetchMetadata('https://www.youtube.com/watch?v=xyz', 'youtube');
    expect(result.metadata?.duration).toBe('5:30');
  });

  it('uses maxres thumbnail over high/medium when all are present', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        items: [
          {
            snippet: {
              title: 'Thumb Priority',
              channelTitle: 'Ch',
              thumbnails: {
                maxres: { url: 'https://img.youtube.com/maxres.jpg' },
                high: { url: 'https://img.youtube.com/high.jpg' },
                medium: { url: 'https://img.youtube.com/medium.jpg' },
              },
            },
            contentDetails: { duration: 'PT1M' },
          },
        ],
      }),
    );

    const result = await fetchMetadata('https://www.youtube.com/watch?v=abc', 'youtube');
    expect(result.image).toBe('https://img.youtube.com/maxres.jpg');
  });

  it('falls back to oEmbed when items array is empty (no crash)', async () => {
    // Data API returns empty items (video not found / unlisted)
    mockFetch.mockResolvedValueOnce(jsonResponse({ items: [] }));
    // oEmbed fallback
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        title: 'oEmbed Fallback',
        thumbnail_url: 'https://img.jpg',
        author_name: 'Ch',
      }),
    );

    const result = await fetchMetadata('https://www.youtube.com/watch?v=abc', 'youtube');
    expect(result.title).toBe('oEmbed Fallback');
  });

  it('returns "0:00" for PT0S duration', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        items: [
          {
            snippet: { title: 'Zero', channelTitle: 'Ch', thumbnails: {} },
            contentDetails: { duration: 'PT0S' },
          },
        ],
      }),
    );
    const result = await fetchMetadata('https://www.youtube.com/watch?v=abc', 'youtube');
    expect(result.metadata?.duration).toBe('0:00');
  });

  it('returns "0:01" for PT1S duration', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        items: [
          {
            snippet: { title: 'One', channelTitle: 'Ch', thumbnails: {} },
            contentDetails: { duration: 'PT1S' },
          },
        ],
      }),
    );
    const result = await fetchMetadata('https://www.youtube.com/watch?v=abc', 'youtube');
    expect(result.metadata?.duration).toBe('0:01');
  });
});

describe('fetchMetadata — Twitter', () => {
  it('extracts tweet text from oEmbed HTML', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        author_name: 'John Doe',
        html: '<blockquote class="twitter-tweet"><p lang="en">Hello world tweet text</p></blockquote>',
      }),
    );

    const result = await fetchMetadata('https://twitter.com/user/status/123', 'twitter');

    expect(result.title).toContain('John Doe');
    expect(result.title).toContain('Hello world tweet text');
    expect(result.excerpt).toBe('Hello world tweet text');
  });

  it('strips trailing t.co URL from tweet text', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        author_name: 'Jane Smith',
        html: '<blockquote class="twitter-tweet"><p lang="en">Great article on AI safety https://t.co/abc123XYZ</p></blockquote>',
      }),
    );

    const result = await fetchMetadata('https://twitter.com/user/status/789', 'twitter');

    expect(result.title).toContain('Jane Smith');
    expect(result.title).toContain('Great article on AI safety');
    expect(result.title).not.toContain('https://t.co/');
    expect(result.excerpt).not.toContain('https://t.co/');
  });

  it('strips t.co URL mid-tweet and trims cleanly', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        author_name: 'Dev User',
        html: '<blockquote class="twitter-tweet"><p lang="en">Check this out https://t.co/xyz999 really interesting</p></blockquote>',
      }),
    );

    const result = await fetchMetadata('https://x.com/user/status/111', 'twitter');

    expect(result.title).not.toContain('https://t.co/');
    expect(result.excerpt).not.toContain('https://t.co/');
  });

  it('falls back to Microlink when author_name is missing from oEmbed', async () => {
    // oEmbed without author_name → should use Microlink fallback (not empty title)
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        html: '<blockquote class="twitter-tweet"><p lang="en">Tweet without author</p></blockquote>',
        // no author_name
      }),
    );
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        data: {
          title: 'Microlink Title',
          description: 'From microlink',
          image: null,
        },
      }),
    );

    const result = await fetchMetadata('https://twitter.com/user/status/123', 'twitter');
    expect(result.title).toBe('Microlink Title');
  });

  it('falls back to Microlink when oEmbed fails', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 404));
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        data: {
          title: 'Microlink Tweet Title',
          description: 'Tweet description',
          image: { url: 'https://pbs.twimg.com/img.jpg' },
        },
      }),
    );

    const result = await fetchMetadata('https://x.com/user/status/456', 'twitter');

    expect(result.title).toBe('Microlink Tweet Title');
    expect(result.excerpt).toBe('Tweet description');
  });
});

describe('fetchMetadata — generic (Microlink)', () => {
  it('returns title, image, excerpt from Microlink', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        data: {
          title: 'Blog Post',
          description: 'A great article',
          image: { url: 'https://example.com/og.jpg' },
          readability: { words: 1200, minutes: 5 },
        },
      }),
    );

    const result = await fetchMetadata('https://example.com/post', 'blog');

    expect(result.title).toBe('Blog Post');
    expect(result.image).toBe('https://example.com/og.jpg');
    expect(result.excerpt).toBe('A great article');
    expect(result.metadata?.word_count).toBe(1200);
    expect(result.metadata?.reading_time).toBe(5);
  });

  it('returns empty on 429 rate limit (not throw)', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 429));

    const result = await fetchMetadata('https://example.com/post', 'blog');

    expect(result).toEqual({});
  });

  it('returns empty on network error (not throw)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchMetadata('https://example.com/post', 'blog');

    expect(result).toEqual({});
  });

  it('handles partial Microlink response — only title populated', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        data: {
          title: 'Just A Title',
          description: null,
          image: null,
          readability: null,
        },
      }),
    );

    const result = await fetchMetadata('https://example.com/post', 'blog');
    expect(result.title).toBe('Just A Title');
    expect(result.image).toBeUndefined();
    expect(result.excerpt).toBeUndefined();
    expect(result.metadata?.word_count).toBeUndefined();
  });
});

describe('fetchMetadata — arXiv', () => {
  // arXiv metadata is fetched via the fetch-arxiv-metadata Edge Function (server-side
  // proxy) to avoid CORS restrictions. Tests mock supabase.functions.invoke.

  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it('passes structured data through from the Edge Function', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        title: 'Attention Is All You Need',
        excerpt: 'We propose the Transformer architecture.',
        metadata: {
          authors: ['Ashish Vaswani', 'Noam Shazeer'],
          abstract: 'We propose the Transformer architecture.',
          arxiv_id: '1706.03762',
          published: '2017-06-12',
        },
      },
      error: null,
    });

    const result = await fetchMetadata('https://arxiv.org/abs/1706.03762', 'arxiv');

    expect(result.title).toBe('Attention Is All You Need');
    expect(result.excerpt).toContain('Transformer');
    expect(result.metadata?.authors).toEqual(['Ashish Vaswani', 'Noam Shazeer']);
    expect(result.metadata?.arxiv_id).toBe('1706.03762');
    expect(result.metadata?.published).toBe('2017-06-12');
  });

  it('calls invoke with the correct arXiv ID extracted from URL', async () => {
    mockInvoke.mockResolvedValueOnce({ data: {}, error: null });

    await fetchMetadata('https://arxiv.org/abs/1706.03762', 'arxiv');

    expect(mockInvoke).toHaveBeenCalledWith('fetch-arxiv-metadata', {
      body: { id: '1706.03762' },
    });
  });

  it('returns empty when invoke returns { data: null, error: null }', async () => {
    mockInvoke.mockResolvedValueOnce({ data: null, error: null });

    const result = await fetchMetadata('https://arxiv.org/abs/9999.99999', 'arxiv');
    expect(result).toEqual({});
  });

  it('returns empty when invoke returns an error', async () => {
    mockInvoke.mockResolvedValueOnce({ data: null, error: new Error('Function error') });

    const result = await fetchMetadata('https://arxiv.org/abs/9999.99999', 'arxiv');

    expect(result).toEqual({});
  });

  it('returns empty when invoke throws (network error)', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchMetadata('https://arxiv.org/abs/1234.56789', 'arxiv');

    expect(result).toEqual({});
  });

  it('returns empty for non-arXiv URLs', async () => {
    const result = await fetchMetadata('https://notarxiv.com/paper', 'arxiv');

    expect(result).toEqual({});
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});

describe('fetchMetadata — routing', () => {
  beforeEach(() => {
    // Ensure no YouTube API key leaks from other describe blocks
    localStorage.removeItem('youtube_api_key');
  });

  it('routes YouTube URLs to YouTube handler (oEmbed)', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));
    await fetchMetadata('https://youtube.com/watch?v=x', 'youtube');

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('youtube.com/oembed');
  });

  it('routes Twitter URLs to Twitter handler', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, 404));
    await fetchMetadata('https://x.com/user/status/1', 'twitter');

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('publish.twitter.com');
  });

  it('routes blog URLs to Microlink', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ data: null }));
    await fetchMetadata('https://example.com/article', 'blog');

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('api.microlink.io');
  });

  it('routes arXiv URLs to the fetch-arxiv-metadata Edge Function', async () => {
    mockInvoke.mockResolvedValueOnce({ data: {}, error: null });

    await fetchMetadata('https://arxiv.org/abs/1706.03762', 'arxiv');

    expect(mockInvoke).toHaveBeenCalledWith('fetch-arxiv-metadata', expect.any(Object));
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
