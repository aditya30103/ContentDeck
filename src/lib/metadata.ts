import type { BookmarkMetadata } from '../types';
import { supabase } from './supabase';

interface MetadataResult {
  title?: string;
  image?: string;
  excerpt?: string;
  metadata?: BookmarkMetadata;
}

const FETCH_TIMEOUT_MS = 10_000;

/** Extract YouTube video ID from various URL formats */
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
    /youtube\.com\/v\/([^?]+)/,
    /youtube\.com\/shorts\/([^?]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

/** Parse ISO 8601 duration (PT1H2M3S) to human-readable (1:02:03 or 5:30) */
function parseYouTubeDuration(iso: string): string | null {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;
  const h = parseInt(match[1] || '0');
  const m = parseInt(match[2] || '0');
  const s = parseInt(match[3] || '0');
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Fetch metadata for a YouTube URL — Data API v3 (with key) → oEmbed fallback */
async function fetchYouTubeMetadata(url: string): Promise<MetadataResult> {
  const videoId = extractYouTubeId(url);
  const ytKey = localStorage.getItem('youtube_api_key');

  // Try YouTube Data API v3 first (requires API key)
  if (videoId && ytKey) {
    try {
      const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${ytKey}`;
      const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (resp.ok) {
        const data = (await resp.json()) as {
          items?: Array<{
            snippet: {
              title: string;
              channelTitle: string;
              description?: string;
              thumbnails: Record<string, { url: string }>;
            };
            contentDetails: { duration: string };
          }>;
        };
        const item = data.items?.[0];
        if (item) {
          const thumb =
            item.snippet.thumbnails.maxres?.url ??
            item.snippet.thumbnails.high?.url ??
            item.snippet.thumbnails.medium?.url;
          return {
            title: item.snippet.title,
            image: thumb,
            excerpt: item.snippet.description ? item.snippet.description.slice(0, 300) : undefined,
            metadata: {
              channel: item.snippet.channelTitle,
              duration: parseYouTubeDuration(item.contentDetails.duration) ?? undefined,
            },
          };
        }
      }
    } catch (err) {
      console.warn('[metadata:youtube] Data API failed, falling through to oEmbed', err);
    }
  }

  // Fallback: oEmbed (no key needed, but no duration)
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const resp = await fetch(oembedUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!resp.ok) return {};
    const data = (await resp.json()) as {
      title?: string;
      thumbnail_url?: string;
      author_name?: string;
    };
    return {
      title: data.title,
      image: data.thumbnail_url,
      metadata: { channel: data.author_name },
    };
  } catch (err) {
    console.warn('[metadata:youtube] oEmbed failed', err);
    return {};
  }
}

/** Fetch metadata for a Twitter/X URL — oEmbed → Microlink fallback */
async function fetchTwitterMetadata(url: string): Promise<MetadataResult> {
  // Try Twitter oEmbed first
  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`;
    const resp = await fetch(oembedUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (resp.ok) {
      const data = (await resp.json()) as { author_name?: string; html?: string };
      if (data.author_name) {
        // Extract tweet text from oEmbed HTML (blockquote content)
        const textMatch = data.html?.match(/<blockquote[^>]*><p[^>]*>(.*?)<\/p>/s);
        const tweetText = textMatch?.[1]
          ?.replace(/<[^>]+>/g, '')
          ?.replace(/&amp;/g, '&')
          ?.replace(/&lt;/g, '<')
          ?.replace(/&gt;/g, '>')
          // Twitter appends a t.co tracking URL to every tweet with media/links
          ?.replace(/https?:\/\/t\.co\/\S+/g, '')
          ?.trim();

        return {
          title: tweetText
            ? `${data.author_name}: ${tweetText.slice(0, 120)}${tweetText.length > 120 ? '...' : ''}`
            : `${data.author_name}'s post`,
          excerpt: tweetText || undefined,
        };
      }
    }
  } catch (err) {
    console.warn('[metadata:twitter] oEmbed failed, falling through to Microlink', err);
  }

  // Fallback: Microlink (handles X.com well)
  return fetchMicrolinkMetadata(url);
}

/** Fetch metadata via Microlink (generic fallback, 50 req/day free) */
async function fetchMicrolinkMetadata(url: string): Promise<MetadataResult> {
  try {
    const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}`;
    const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!resp.ok) return {};
    const json = (await resp.json()) as {
      data?: {
        title?: string;
        description?: string;
        image?: { url?: string };
        readability?: { words?: number; minutes?: number };
      };
    };
    if (!json.data) return {};
    return {
      title: json.data.title,
      image: json.data.image?.url,
      excerpt: json.data.description || undefined,
      metadata: {
        word_count: json.data.readability?.words,
        reading_time: json.data.readability?.minutes,
      },
    };
  } catch (err) {
    console.warn('[metadata:microlink] failed', err);
    return {};
  }
}

/** Extract arXiv paper ID from URL (abs or pdf paths) */
function extractArxivId(url: string): string | null {
  const m = url.match(/arxiv\.org\/(?:abs|pdf)\/([\d.]+(?:v\d+)?)/i);
  return m?.[1] ?? null;
}

/** Fetch metadata for an arXiv paper via the fetch-arxiv-metadata Edge Function.
 * Direct browser requests to export.arxiv.org are blocked by CORS — the Edge
 * Function proxies the request server-side and returns structured JSON. */
async function fetchArxivMetadata(url: string): Promise<MetadataResult> {
  const id = extractArxivId(url);
  if (!id) return {};
  try {
    const res = await supabase.functions.invoke('fetch-arxiv-metadata', { body: { id } });
    if (res.error) {
      console.warn('[metadata:arxiv] edge function error', res.error);
      return {};
    }
    return (res.data as MetadataResult | null) ?? {};
  } catch (err) {
    console.warn('[metadata:arxiv] failed', err);
    return {};
  }
}

/** Fetch metadata for a bookmark URL based on its source type */
export async function fetchMetadata(url: string, sourceType: string): Promise<MetadataResult> {
  switch (sourceType) {
    case 'youtube':
      return fetchYouTubeMetadata(url);
    case 'twitter':
      return fetchTwitterMetadata(url);
    case 'arxiv':
      return fetchArxivMetadata(url);
    default:
      return fetchMicrolinkMetadata(url);
  }
}
