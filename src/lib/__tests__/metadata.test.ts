import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchMetadata } from '../metadata';

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
});

describe('fetchMetadata — arXiv', () => {
  function xmlResponse(xml: string, status = 200): Response {
    return {
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(xml),
    } as Response;
  }

  function makeArxivXml(
    overrides: {
      title?: string;
      summary?: string;
      published?: string;
      authors?: string[];
    } = {},
  ): string {
    const title = overrides.title ?? 'Attention Is All You Need';
    const summary = overrides.summary ?? 'We propose the Transformer architecture.';
    const published = overrides.published ?? '2017-06-12T00:00:00Z';
    const authors = overrides.authors ?? ['Ashish Vaswani', 'Noam Shazeer'];
    const authorXml = authors.map((a) => `<author><name>${a}</name></author>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/1706.03762v5</id>
    <title>${title}</title>
    <summary>${summary}</summary>
    <published>${published}</published>
    ${authorXml}
  </entry>
</feed>`;
  }

  it('returns title, authors, abstract, arxiv_id from API', async () => {
    mockFetch.mockResolvedValueOnce(xmlResponse(makeArxivXml()));

    const result = await fetchMetadata('https://arxiv.org/abs/1706.03762', 'arxiv');

    expect(result.title).toBe('Attention Is All You Need');
    expect(result.excerpt).toContain('Transformer');
    expect(result.metadata?.authors).toEqual(['Ashish Vaswani', 'Noam Shazeer']);
    expect(result.metadata?.abstract).toContain('Transformer');
    expect(result.metadata?.arxiv_id).toBe('1706.03762');
    expect(result.metadata?.published).toBe('2017-06-12');
  });

  it('returns empty when API returns no entry element', async () => {
    mockFetch.mockResolvedValueOnce(
      xmlResponse(`<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"></feed>`),
    );

    const result = await fetchMetadata('https://arxiv.org/abs/9999.99999', 'arxiv');

    expect(result).toEqual({});
  });

  it('returns empty when fetch throws (network error)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchMetadata('https://arxiv.org/abs/1234.56789', 'arxiv');

    expect(result).toEqual({});
  });

  it('routes arxiv URLs to arXiv handler', async () => {
    mockFetch.mockResolvedValueOnce(xmlResponse(makeArxivXml()));
    await fetchMetadata('https://arxiv.org/abs/1706.03762', 'arxiv');

    const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('export.arxiv.org/api/query');
    expect(calledUrl).toContain('1706.03762');
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
});
