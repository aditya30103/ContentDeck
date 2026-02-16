export type SourceType = 'youtube' | 'twitter' | 'linkedin' | 'substack' | 'blog' | 'book';
export type Status = 'unread' | 'reading' | 'done';
export type NoteType = 'insight' | 'question' | 'highlight' | 'note';
export type ContentStatus = 'pending' | 'extracting' | 'success' | 'failed' | 'skipped';
export type SortOption = 'newest' | 'oldest' | 'title';
export type ViewMode = 'list' | 'areas';

export interface Note {
  type: NoteType;
  content: string;
  created_at: string;
}

export interface BookmarkMetadata {
  duration?: string;
  channel?: string;
  word_count?: number;
  reading_time?: number;
}

export interface BookmarkContent {
  text?: string;
  author?: string;
  word_count?: number;
  reading_time?: number;
  lead_image?: string;
  excerpt?: string;
  extracted_at?: string;
  method?: 'readability' | 'failed';
  error?: string;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string | null;
  image: string | null;
  excerpt: string | null;
  source_type: SourceType;
  status: Status;
  is_favorited: boolean;
  notes: Note[];
  tags: string[];
  metadata: BookmarkMetadata;
  content: BookmarkContent;
  content_status: ContentStatus;
  content_fetched_at: string | null;
  synced: boolean;
  created_at: string;
  status_changed_at: string;
  started_reading_at: string | null;
  finished_at: string | null;
}

export interface TagArea {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  emoji: string | null;
  sort_order: number;
  created_at: string;
}

export interface BookmarkTag {
  bookmark_id: string;
  tag_area_id: string;
}

export interface UserToken {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
}

export interface StatusHistoryEntry {
  id: string;
  bookmark_id: string;
  old_status: string | null;
  new_status: string;
  changed_at: string;
}

export const STATUS_NEXT: Record<Status, Status> = {
  unread: 'reading',
  reading: 'done',
  done: 'unread',
};

export const SOURCE_LABELS: Record<SourceType, string> = {
  youtube: 'YouTube',
  twitter: 'Twitter',
  linkedin: 'LinkedIn',
  substack: 'Substack',
  blog: 'Blog',
  book: 'Book',
};

export const SOURCE_LIST: SourceType[] = [
  'youtube',
  'twitter',
  'linkedin',
  'substack',
  'blog',
  'book',
];
export const STATUS_LIST: Status[] = ['unread', 'reading', 'done'];
