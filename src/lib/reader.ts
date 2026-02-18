/**
 * Parses plain text extracted by Readability into structured content blocks.
 * Detects headings, bullet/numbered lists, and paragraphs from formatting heuristics.
 */

export type ContentBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

/** Matches lines that start with a bullet or numbered list marker */
const LIST_MARKER = /^([-•*]|\d+[.):])\s+\S/;

/**
 * A single short line is treated as a heading if:
 * - 3–90 characters
 * - No more than 10 words
 * - Doesn't end with a sentence-terminating character (. , ; !)
 *   Exception: lines ending with ':' are strong heading candidates
 * - Not a list item itself
 */
function looksLikeHeading(line: string): boolean {
  if (line.length < 3 || line.length > 90) return false;
  if (LIST_MARKER.test(line)) return false;
  const wordCount = line.split(/\s+/).length;
  if (wordCount > 10) return false;
  // Lines ending with ':' are section intros — strong heading signal
  if (line.endsWith(':')) return true;
  // Reject lines that end like regular sentences
  if (/[.,;!]$/.test(line)) return false;
  return true;
}

/**
 * Split raw extracted text into chunks separated by paragraph breaks.
 * Handles both double-newline (\n\n) and single-newline (\n) separators,
 * since Readability output varies by site.
 */
function splitIntoChunks(text: string): string[] {
  // Prefer double-newline splitting; fall back to single-newline if text
  // has very few double-newlines (e.g. content from sites using \n only)
  const doubleNewlineChunks = text
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (doubleNewlineChunks.length >= 3) return doubleNewlineChunks;

  // Fallback: split on single newlines
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * After single-newline fallback splitting produces individual lines,
 * merge consecutive list-marker lines back into one chunk so the list
 * detector sees them as a group rather than isolated single-item chunks.
 */
function mergeAdjacentListItems(chunks: string[]): string[] {
  const result: string[] = [];
  for (const chunk of chunks) {
    // Pop the last element (returns undefined if empty — no length guard needed)
    const prev = result.pop();
    if (prev !== undefined && LIST_MARKER.test(prev) && LIST_MARKER.test(chunk)) {
      // Both current and previous are list items — combine into one multi-line chunk
      result.push(prev + '\n' + chunk);
    } else {
      if (prev !== undefined) result.push(prev);
      result.push(chunk);
    }
  }
  return result;
}

export function parseContentBlocks(text: string): ContentBlock[] {
  if (!text.trim()) return [];

  const chunks = mergeAdjacentListItems(splitIntoChunks(text));
  const blocks: ContentBlock[] = [];

  for (const chunk of chunks) {
    const lines = chunk
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;

    // Single-line chunk that looks like a heading
    const firstLine = lines[0];
    if (lines.length === 1 && firstLine !== undefined && looksLikeHeading(firstLine)) {
      blocks.push({ type: 'heading', text: firstLine });
      continue;
    }

    // Chunk where the majority of lines are list items
    const listLines = lines.filter((l) => LIST_MARKER.test(l));
    if (listLines.length >= 2 && listLines.length / lines.length >= 0.5) {
      const items = listLines.map((l) => l.replace(/^([-•*]|\d+[.):]) /, '').trim());
      blocks.push({ type: 'list', items });
      continue;
    }

    // Default: paragraph
    blocks.push({ type: 'paragraph', text: chunk });
  }

  return blocks;
}
