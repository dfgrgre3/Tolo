/**
 * Community Domain Types
 *
 * المالك الوحيد لنماذج: الإعلانات، محادثات الدردشة، المستخدمين في المجتمع.
 */

// ─── الإعلانات ────────────────────────────────────────────────────

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
  createdAt: string;
  updatedAt?: string;
  isPinned?: boolean;
  tags?: string[];
}

export interface CreateAnnouncementRequest {
  title: string;
  content: string;
  isPinned?: boolean;
  tags?: string[];
}

// ─── المستخدمون في المجتمع ────────────────────────────────────────

export interface CommunityUser {
  id: string;
  name: string;
  username?: string;
  avatar?: string;
  role?: string;
  isOnline?: boolean;
}

// ─── الدردشة ──────────────────────────────────────────────────────

export interface ChatConversation {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName?: string;
  content: string;
  createdAt: string;
  isRead?: boolean;
}

export interface SendMessageRequest {
  recipientId: string;
  content: string;
}
