import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    const body = (await req.json()) as { id?: unknown };
    const id = body.id;

    // Validate arXiv ID format (e.g. "2501.05398" or "2501.05398v2")
    if (typeof id !== 'string' || !/^[\d.]+(?:v\d+)?$/.test(id)) {
      return json({ error: 'Invalid arXiv ID' }, 400);
    }

    const resp = await fetch(`https://export.arxiv.org/api/query?id_list=${id}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return json({});

    const xml = await resp.text();

    // Check for empty results
    if (xml.includes('<opensearch:totalResults>0</opensearch:totalResults>')) return json({});

    // Isolate the <entry> block so we don't accidentally match the feed-level <title>
    const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/);
    if (!entryMatch) return json({});
    const entry = entryMatch[1];

    const tag = (name: string) => {
      const m = entry.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
      return m?.[1]?.trim().replace(/\s+/g, ' ') ?? '';
    };

    const title = tag('title');
    const abstract = tag('summary');
    const published = entry.match(/<published>(\d{4}-\d{2}-\d{2})/)?.[1];
    const authors = [...entry.matchAll(/<name>([^<]+)<\/name>/g)].map((m) => m[1].trim());

    return json({
      title: title || undefined,
      excerpt: abstract ? abstract.slice(0, 300) : undefined,
      metadata: {
        authors: authors.length > 0 ? authors : undefined,
        abstract: abstract || undefined,
        arxiv_id: id,
        published,
      },
    });
  } catch (err) {
    console.error('[fetch-arxiv-metadata] error', { error: (err as Error).message });
    return json({});
  }
});
