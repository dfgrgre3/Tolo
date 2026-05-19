export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  type: string;
  parentId?: string;
  icon?: string;
  color?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  authorId: string;
  categoryId?: string;
  status: ContentStatus;
  viewCount: number;
  publishedAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ForumTopic {
  id: string;
  title: string;
  content: string;
  authorId: string;
  categoryId?: string;
  isPinned: boolean;
  isLocked: boolean;
  viewCount: number;
  replyCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface LiveEvent {
  id: string;
  title: string;
  description?: string;
  hostId: string;
  subjectId?: string;
  scheduledAt: Date | string;
  durationMinutes: number;
  status: string;
  meetingUrl?: string;
  recordingUrl?: string;
  maxAttendees?: number;
  currentAttendees: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  description?: string;
  coverImage?: string;
  pdfUrl?: string;
  subjectId?: string;
  categoryId?: string;
  pageCount: number;
  language: string;
  isbn?: string;
  isPremium: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}
