import type { Bookmark } from '../types';
import { formatDate, getDomain, isBookWithoutUrl } from './utils';
import { SOURCE_LABELS } from '../types';

/** Escape a string for use as a YAML double-quoted value */
function yamlEscape(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/** Generate markdown for a single bookmark with YAML frontmatter */
export function generateMarkdown(bookmark: Bookmark): string {
  const lines: string[] = [];

  const noUrl = isBookWithoutUrl(bookmark);

  // YAML frontmatter
  lines.push('---');
  if (!noUrl) lines.push(`url: "${yamlEscape(bookmark.url)}"`);
  if (bookmark.title) lines.push(`title: "${yamlEscape(bookmark.title)}"`);
  lines.push(`source: ${SOURCE_LABELS[bookmark.source_type]}`);
  lines.push(`status: ${bookmark.status}`);
  lines.push(`content_deck_id: "${bookmark.id}"`);
  if (bookmark.is_favorited) lines.push('favorited: true');
  if (bookmark.areas.length > 0) {
    lines.push(`areas: [${bookmark.areas.map((a) => `"[[${yamlEscape(a.name)}]]"`).join(', ')}]`);
  }
  if (bookmark.tags.length > 0) {
    lines.push(`tags: [${bookmark.tags.map((t) => `"[[${yamlEscape(t)}]]"`).join(', ')}]`);
  }
  lines.push(`created: ${formatDate(bookmark.created_at)}`);
  if (bookmark.started_reading_at)
    lines.push(`started: ${formatDate(bookmark.started_reading_at)}`);
  if (bookmark.finished_at) lines.push(`finished: ${formatDate(bookmark.finished_at)}`);
  if (bookmark.metadata?.reading_time)
    lines.push(`reading_time: ${bookmark.metadata.reading_time} min`);
  if (bookmark.metadata?.channel) lines.push(`channel: "${yamlEscape(bookmark.metadata.channel)}"`);
  if (bookmark.metadata?.author) lines.push(`author: "${yamlEscape(bookmark.metadata.author)}"`);
  if (bookmark.metadata?.authors && bookmark.metadata.authors.length > 0)
    lines.push(
      `authors: [${bookmark.metadata.authors.map((a) => `"${yamlEscape(a)}"`).join(', ')}]`,
    );
  if (bookmark.metadata?.arxiv_id) lines.push(`arxiv_id: ${bookmark.metadata.arxiv_id}`);

  lines.push('---');
  lines.push('');

  // Title
  lines.push(`# ${bookmark.title || (noUrl ? 'Untitled Book' : bookmark.url)}`);
  lines.push('');

  // Link — omitted for URL-less books
  if (!noUrl) {
    lines.push(`> [Open original](${bookmark.url}) — ${getDomain(bookmark.url)}`);
    lines.push('');
  }

  // Summary / Abstract
  const isArxiv = bookmark.source_type === 'arxiv';
  const summaryText = isArxiv
    ? (bookmark.metadata?.abstract ?? bookmark.excerpt)
    : bookmark.excerpt;
  if (summaryText) {
    lines.push(`## ${isArxiv ? 'Abstract' : 'Summary'}`);
    lines.push('');
    lines.push(summaryText);
    lines.push('');
  }

  // Notes (non-reflection)
  const regularNotes = bookmark.notes.filter((n) => n.type !== 'reflection');
  const reflections = bookmark.notes.filter((n) => n.type === 'reflection');

  if (regularNotes.length > 0) {
    lines.push('## Notes');
    lines.push('');
    for (const note of regularNotes) {
      const emoji =
        { insight: '💡', question: '❓', highlight: '🖍️', note: '📝' }[
          note.type as 'insight' | 'question' | 'highlight' | 'note'
        ] ?? '📝';
      const label = note.type.charAt(0).toUpperCase() + note.type.slice(1);
      lines.push(`### ${emoji} ${label}`);
      lines.push('');
      lines.push(note.content);
      lines.push('');
      lines.push(`*${formatDate(note.created_at)}*`);
      lines.push('');
    }
  }

  // Reflection notes
  if (reflections.length > 0) {
    lines.push('## Reflection');
    lines.push('');
    for (const note of reflections) {
      lines.push(note.content);
      lines.push('');
      lines.push(`*${formatDate(note.created_at)}*`);
      lines.push('');
    }
  }

  // Metadata footer
  if (bookmark.metadata?.duration || bookmark.metadata?.word_count) {
    lines.push('---');
    lines.push('');
    const meta: string[] = [];
    if (bookmark.metadata.duration) meta.push(`Duration: ${bookmark.metadata.duration}`);
    if (bookmark.metadata.word_count)
      meta.push(`Words: ${bookmark.metadata.word_count.toLocaleString()}`);
    if (bookmark.metadata.reading_time)
      meta.push(`Reading time: ${bookmark.metadata.reading_time} min`);
    lines.push(meta.join(' | '));
    lines.push('');
  }

  return lines.join('\n');
}

/** Generate a safe filename from a bookmark title */
function safeFilename(bookmark: Bookmark): string {
  const name =
    bookmark.title || (isBookWithoutUrl(bookmark) ? 'Untitled Book' : getDomain(bookmark.url));
  return (
    name
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 100) + '.md'
  );
}

/** Get the folder path based on source type */
function getFolder(bookmark: Bookmark): string {
  const folders: Record<string, string> = {
    youtube: 'Videos',
    twitter: 'Threads',
    linkedin: 'LinkedIn',
    substack: 'Articles',
    blog: 'Articles',
    book: 'Books',
    arxiv: 'Papers',
  };
  return folders[bookmark.source_type] || 'Articles';
}

/** Export a single bookmark via Obsidian URI scheme (one-click) */
export function exportToObsidianUri(bookmark: Bookmark, vaultName: string): boolean {
  if (!vaultName) return false;

  const sourceLabel = SOURCE_LABELS[bookmark.source_type] || 'Blog';
  const safeTitle = (bookmark.title || getDomain(bookmark.url))
    .slice(0, 100)
    .replace(/[\\/:*?"<>|]/g, '-');
  const filePath = `Inbox/${sourceLabel}/${safeTitle}`;
  const content = encodeURIComponent(generateMarkdown(bookmark));
  const uri = `obsidian://new?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(filePath)}&content=${content}`;

  window.open(uri);
  return true;
}

/** Fallback: copy markdown to clipboard */
export async function exportToClipboard(bookmark: Bookmark): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(generateMarkdown(bookmark));
    return true;
  } catch {
    return false;
  }
}

/** Batch export multiple bookmarks */
export async function batchExport(
  bookmarks: Bookmark[],
  vaultFolder: string,
  onProgress?: (current: number, total: number) => void,
): Promise<{ exported: number; failed: number }> {
  if (!('showDirectoryPicker' in window)) {
    // Fallback: concatenate all and copy to clipboard
    const combined = bookmarks.map(generateMarkdown).join('\n\n---\n\n');
    try {
      await navigator.clipboard.writeText(combined);
      return { exported: bookmarks.length, failed: 0 };
    } catch {
      return { exported: 0, failed: bookmarks.length };
    }
  }

  try {
    const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    let exported = 0;
    let failed = 0;

    for (let i = 0; i < bookmarks.length; i++) {
      const bookmark = bookmarks[i]!;
      onProgress?.(i + 1, bookmarks.length);

      try {
        let targetDir = dirHandle;
        if (vaultFolder) {
          for (const part of vaultFolder.split('/').filter(Boolean)) {
            targetDir = await targetDir.getDirectoryHandle(part, { create: true });
          }
        }

        const folder = getFolder(bookmark);
        targetDir = await targetDir.getDirectoryHandle(folder, { create: true });

        const filename = safeFilename(bookmark);
        const fileHandle = await targetDir.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(generateMarkdown(bookmark));
        await writable.close();
        exported++;
      } catch {
        failed++;
      }
    }

    return { exported, failed };
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return { exported: 0, failed: 0 };
    }
    return { exported: 0, failed: bookmarks.length };
  }
}

// Augment Window for File System Access API types
declare global {
  interface Window {
    showDirectoryPicker(options?: { mode?: string }): Promise<FileSystemDirectoryHandle>;
  }
  interface FileSystemDirectoryHandle {
    getDirectoryHandle(
      name: string,
      options?: { create?: boolean },
    ): Promise<FileSystemDirectoryHandle>;
    getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
  }
  interface FileSystemFileHandle {
    createWritable(): Promise<FileSystemWritableFileStream>;
  }
  interface FileSystemWritableFileStream {
    write(data: string | BufferSource | Blob): Promise<void>;
    close(): Promise<void>;
  }
}
