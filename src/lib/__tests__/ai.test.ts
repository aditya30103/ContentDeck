import { describe, it, expect, vi, beforeEach } from 'vitest';
import { suggestTags, bulkSuggestTags } from '../ai';
import type { Bookmark, TagArea } from '../../types';

const mockFetch = vi.mocked(fetch);

function aiResponse(content: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () =>
      Promise.resolve({
        choices: [{ message: { content } }],
      }),
  } as Response;
}

function makeBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: 'bm-1',
    url: 'https://example.com/article',
    title: 'Test Article',
    image: null,
    excerpt: 'An excerpt about testing',
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
    created_at: '2024-01-01T00:00:00Z',
    status_changed_at: '2024-01-01T00:00:00Z',
    started_reading_at: null,
    finished_at: null,
    ...overrides,
  };
}

const testAreas: TagArea[] = [
  {
    id: 'a1',
    name: 'Programming',
    description: null,
    color: null,
    emoji: null,
    sort_order: 0,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'a2',
    name: 'Design',
    description: null,
    color: null,
    emoji: null,
    sort_order: 1,
    created_at: '2024-01-01T00:00:00Z',
  },
];

beforeEach(() => {
  localStorage.setItem('openrouter_key', 'test-api-key');
});

describe('suggestTags — JSON parsing', () => {
  it('parses clean JSON response', async () => {
    mockFetch.mockResolvedValueOnce(
      aiResponse('{"tags": ["react", "testing"], "areas": ["Programming"], "suggestedArea": ""}'),
    );

    const result = await suggestTags(makeBookmark(), ['existing-tag'], testAreas);

    expect(result.tags).toEqual(['react', 'testing']);
    expect(result.areas).toEqual(['Programming']);
  });

  it('parses markdown-wrapped JSON response', async () => {
    mockFetch.mockResolvedValueOnce(
      aiResponse(
        '```json\n{"tags": ["api design", "rest"], "areas": [], "suggestedArea": "Backend"}\n```',
      ),
    );

    const result = await suggestTags(makeBookmark(), [], testAreas);

    expect(result.tags).toEqual(['api design', 'rest']);
    expect(result.suggestedArea).toBe('Backend');
  });

  it('handles empty/missing fields gracefully', async () => {
    mockFetch.mockResolvedValueOnce(aiResponse('{"tags": [], "areas": []}'));

    const result = await suggestTags(makeBookmark(), [], []);

    expect(result.tags).toEqual([]);
    expect(result.areas).toEqual([]);
    expect(result.suggestedArea).toBeUndefined();
  });

  it('lowercases and trims tags', async () => {
    mockFetch.mockResolvedValueOnce(
      aiResponse('{"tags": ["  React Hooks  ", " API "], "areas": []}'),
    );

    const result = await suggestTags(makeBookmark(), [], []);

    expect(result.tags).toEqual(['react hooks', 'api']);
  });
});

describe('suggestTags — prompt construction', () => {
  it('includes title, URL, source type, and excerpt in prompt', async () => {
    mockFetch.mockResolvedValueOnce(aiResponse('{"tags": ["test"], "areas": []}'));

    const bookmark = makeBookmark({
      url: 'https://blog.example.com/post',
      title: 'My Post',
      excerpt: 'Post excerpt here',
      source_type: 'blog',
    });

    await suggestTags(bookmark, [], []);

    const body = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string) as {
      messages: { content: string }[];
    };
    const prompt = body.messages[1]!.content;

    expect(prompt).toContain('https://blog.example.com/post');
    expect(prompt).toContain('My Post');
    expect(prompt).toContain('blog');
    expect(prompt).toContain('Post excerpt here');
  });

  it('includes existing tags and areas in prompt', async () => {
    mockFetch.mockResolvedValueOnce(aiResponse('{"tags": ["new"], "areas": []}'));

    await suggestTags(makeBookmark(), ['react', 'typescript'], testAreas);

    const body = JSON.parse(mockFetch.mock.calls[0]![1]!.body as string) as {
      messages: { content: string }[];
    };
    const prompt = body.messages[1]!.content;

    expect(prompt).toContain('react, typescript');
    expect(prompt).toContain('Programming');
    expect(prompt).toContain('Design');
  });
});

describe('callOpenRouter — retry and error handling', () => {
  it('throws when no API key is configured', async () => {
    localStorage.removeItem('openrouter_key');

    await expect(suggestTags(makeBookmark(), [], [])).rejects.toThrow(
      'No OpenRouter API key configured',
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('retries on 429 with backoff', async () => {
    vi.useFakeTimers();
    // First call: 429
    mockFetch.mockResolvedValueOnce(aiResponse('', 429));
    // Second call: success
    mockFetch.mockResolvedValueOnce(aiResponse('{"tags": ["retry-worked"], "areas": []}'));

    const promise = suggestTags(makeBookmark(), [], []);
    // Advance past the backoff delay
    await vi.advanceTimersByTimeAsync(2000);
    const result = await promise;

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.tags).toEqual(['retry-worked']);
    vi.useRealTimers();
  });

  it('throws on non-retryable errors (500)', { timeout: 15_000 }, async () => {
    // All 3 retries fail with 500
    mockFetch.mockResolvedValue(aiResponse('', 500));

    await expect(suggestTags(makeBookmark(), [], [])).rejects.toThrow('OpenRouter error: 500');
  });

  it('respects abort signal', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(suggestTags(makeBookmark(), [], [], controller.signal)).rejects.toThrow('Aborted');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('suggestTags — edge cases', () => {
  beforeEach(() => {
    // Reset persistent mocks from previous describe blocks (e.g. mockResolvedValue from 500 test)
    mockFetch.mockReset();
    localStorage.setItem('openrouter_key', 'test-api-key');
  });

  it('rejects on invalid JSON response (not silently empty)', async () => {
    mockFetch.mockResolvedValueOnce(aiResponse('{invalid json}'));
    await expect(suggestTags(makeBookmark(), [], [])).rejects.toThrow();
  });

  it('throws "Empty AI response" when choices[0].message.content is null', async () => {
    // The code retries all caught errors, so mock all 3 attempts with null content.
    // After MAX_RETRIES the loop throws lastError = "Empty AI response".
    const nullContentResponse = {
      ok: true,
      status: 200,
      json: () => Promise.resolve({ choices: [{ message: { content: null } }] }),
    } as Response;
    mockFetch.mockResolvedValue(nullContentResponse);
    await expect(suggestTags(makeBookmark(), [], [])).rejects.toThrow('Empty AI response');
  });

  it('does not crash when excerpt is null', async () => {
    mockFetch.mockResolvedValueOnce(aiResponse('{"tags": [], "areas": []}'));
    await expect(suggestTags(makeBookmark({ excerpt: null }), [], [])).resolves.not.toThrow();
  });

  it('does not crash when areas list is empty', async () => {
    mockFetch.mockResolvedValueOnce(aiResponse('{"tags": ["test"], "areas": []}'));
    const result = await suggestTags(makeBookmark(), [], []);
    expect(result.tags).toEqual(['test']);
  });

  it('passes through area names that are not in user list (no filtering at this layer)', async () => {
    // The prompt tells the AI to only use areas from the user list, but suggestTags
    // doesn't enforce this — filtering would need to happen at the caller level
    mockFetch.mockResolvedValueOnce(
      aiResponse('{"tags": [], "areas": ["NonExistentArea"], "suggestedArea": ""}'),
    );
    const result = await suggestTags(makeBookmark(), [], testAreas);
    expect(result.areas).toContain('NonExistentArea');
  });
});

describe('callOpenRouter — max retries exhausted', () => {
  it('throws after 3 consecutive 429 responses', { timeout: 15_000 }, async () => {
    vi.useFakeTimers();
    mockFetch
      .mockResolvedValueOnce(aiResponse('', 429))
      .mockResolvedValueOnce(aiResponse('', 429))
      .mockResolvedValueOnce(aiResponse('', 429));

    const promise = suggestTags(makeBookmark(), [], []);
    // Suppress unhandled rejection that fires between creation and the expect below
    promise.catch(() => {});
    // Advance past all backoff delays (1s + 2s = 3s, but 3rd attempt also has delay)
    await vi.runAllTimersAsync();
    await expect(promise).rejects.toThrow();
    expect(mockFetch).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });
});

describe('bulkSuggestTags', () => {
  it('accumulates tags across iterations', async () => {
    mockFetch.mockResolvedValueOnce(aiResponse('{"tags": ["tag-a"], "areas": []}'));
    mockFetch.mockResolvedValueOnce(aiResponse('{"tags": ["tag-b"], "areas": []}'));

    const bookmarks = [makeBookmark({ id: 'bm-1' }), makeBookmark({ id: 'bm-2' })];
    const existingTags: string[] = [];
    const onProgress = vi.fn();

    const results = await bulkSuggestTags(bookmarks, existingTags, [], onProgress);

    expect(results.size).toBe(2);
    expect(results.get('bm-1')?.tags).toEqual(['tag-a']);
    expect(results.get('bm-2')?.tags).toEqual(['tag-b']);
    // Tags should accumulate into the existingTags array
    expect(existingTags).toContain('tag-a');
    expect(existingTags).toContain('tag-b');
    expect(onProgress).toHaveBeenCalledTimes(2);
  });

  it('stops on abort signal', async () => {
    const controller = new AbortController();
    mockFetch.mockResolvedValueOnce(aiResponse('{"tags": ["tag-a"], "areas": []}'));

    const bookmarks = [makeBookmark({ id: 'bm-1' }), makeBookmark({ id: 'bm-2' })];
    const onProgress = vi.fn();

    // Abort after first bookmark completes
    onProgress.mockImplementationOnce(() => controller.abort());

    const results = await bulkSuggestTags(bookmarks, [], [], onProgress, controller.signal);

    // Should have only processed the first bookmark
    expect(results.size).toBe(1);
  });
});
