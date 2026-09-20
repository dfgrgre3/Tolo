/**
 * Community API Gateway
 *
 * المالك الوحيد لاستدعاءات المجتمع والإعلانات والدردشة.
 */

import { apiClient } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";
import type {
  Announcement,
  CreateAnnouncementRequest,
  CommunityUser,
  ChatConversation,
  ChatMessage,
  SendMessageRequest,
} from "../domain/types";

// ─── الإعلانات ────────────────────────────────────────────────────

export async function fetchAnnouncements(): Promise<Announcement[]> {
  const data = await apiClient.get<
    Announcement[] | { announcements: Announcement[] }
  >(apiRoutes.community.announcements);
  return Array.isArray(data) ? data : data.announcements ?? [];
}

export async function createAnnouncement(
  request: CreateAnnouncementRequest,
): Promise<Announcement> {
  return apiClient.post<Announcement>(
    apiRoutes.community.createAnnouncement,
    request,
  );
}

// ─── مستخدمو المجتمع ──────────────────────────────────────────────

export async function fetchCommunityUsers(): Promise<CommunityUser[]> {
  const data = await apiClient.get<
    CommunityUser[] | { users: CommunityUser[] }
  >(apiRoutes.community.users);
  return Array.isArray(data) ? data : data.users ?? [];
}

export async function fetchCommunityUserById(
  userId: string,
): Promise<CommunityUser> {
  return apiClient.get<CommunityUser>(apiRoutes.community.userById(userId));
}

// ─── الدردشة ──────────────────────────────────────────────────────

export async function fetchChatConversations(): Promise<ChatConversation[]> {
  const data = await apiClient.get<
    ChatConversation[] | { conversations: ChatConversation[] }
  >(apiRoutes.community.chat.conversations);
  return Array.isArray(data) ? data : data.conversations ?? [];
}

export async function fetchChatMessages(
  chatUserId: string,
): Promise<ChatMessage[]> {
  const data = await apiClient.get<
    ChatMessage[] | { messages: ChatMessage[] }
  >(apiRoutes.community.chat.messages(chatUserId));
  return Array.isArray(data) ? data : data.messages ?? [];
}

export async function sendChatMessage(
  request: SendMessageRequest,
): Promise<ChatMessage> {
  return apiClient.post<ChatMessage>(
    apiRoutes.community.chat.sendMessage,
    request,
  );
}

// ─── مرايا النقل الخام (حد ترحيل الواجهات F-018) ─────────────────────
// Transport-only 1:1 mirrors of pre-existing UI call sites. Each function
// uses the exact route + method + payload shape the UI used before, and
// returns the raw payload so envelope parsing stays in the UI untouched.
// Zero behavior change by construction; normalization moves here later,
// one domain at a time.
type RawPayload = Record<string, unknown>;

// — المدونة —
export function fetchBlogPostsRaw(): Promise<unknown> {
  return apiClient.get<unknown>(apiRoutes.blog.posts);
}

export function fetchBlogCategoriesRaw(): Promise<unknown> {
  return apiClient.get<unknown>(apiRoutes.blog.categories);
}

export function fetchBlogPostRaw<T>(id: string): Promise<T> {
  return apiClient.get<T>(apiRoutes.blog.post(id));
}

export function incrementBlogPostViewRaw(id: string): Promise<unknown> {
  return apiClient.postJson(apiRoutes.blog.incrementView(id), {});
}

export function createBlogPostRaw(payload: RawPayload): Promise<{ id: string }> {
  return apiClient.postJson<{ id: string }>(apiRoutes.blog.posts, payload);
}

// — المنتدى —
export function fetchForumPostsRaw(): Promise<unknown> {
  return apiClient.get<unknown>(apiRoutes.forum.posts);
}

export function fetchForumCategoriesRaw(): Promise<unknown> {
  return apiClient.get<unknown>(apiRoutes.forum.categories);
}

export function fetchForumPostRaw<T>(id: string): Promise<T> {
  return apiClient.get<T>(apiRoutes.forum.post(id));
}

export function fetchForumRepliesRaw<T>(id: string): Promise<T> {
  return apiClient.get<T>(apiRoutes.forum.replies(id));
}

export function incrementForumPostViewRaw(id: string): Promise<unknown> {
  return apiClient.postJson(apiRoutes.forum.incrementView(id), {});
}

export function createForumPostRaw(payload: RawPayload): Promise<{ id: string }> {
  return apiClient.postJson<{ id: string }>(apiRoutes.forum.createPost, payload);
}

export function createForumReplyRaw<T>(id: string, payload: RawPayload): Promise<T> {
  return apiClient.postJson<T>(apiRoutes.forum.createReply(id), payload);
}

// — الفعاليات —
export function fetchEventRaw<T>(id: string): Promise<T> {
  return apiClient.get<T>(apiRoutes.events.byId(id));
}

export function fetchEventAttendeesRaw<T>(id: string): Promise<T> {
  return apiClient.get<T>(apiRoutes.events.attendees(id));
}

export function attendEventRaw(id: string, payload: RawPayload): Promise<unknown> {
  return apiClient.postJson(apiRoutes.events.attend(id), payload);
}

export function leaveEventRaw(id: string, payload: RawPayload): Promise<unknown> {
  return apiClient.delete(apiRoutes.events.attend(id), {
    body: JSON.stringify(payload),
  });
}

export function createEventRaw(payload: RawPayload): Promise<{ id: string }> {
  return apiClient.postJson<{ id: string }>(apiRoutes.events.list, payload);
}

// — المسابقات —
export function fetchContestsRaw(): Promise<unknown> {
  return apiClient.get<unknown>(apiRoutes.contests.list);
}

export function createContestRaw(payload: RawPayload): Promise<{ id: string }> {
  return apiClient.postJson<{ id: string }>(apiRoutes.contests.list, payload);
}

// — الإعلانات (خام؛ النسخ المطبوعة أعلاه تبقى) —
export function fetchAnnouncementsRaw(): Promise<unknown> {
  return apiClient.get<unknown>(apiRoutes.community.announcements);
}

export function createAnnouncementRaw(payload: RawPayload): Promise<{ id: string }> {
  return apiClient.postJson<{ id: string }>(
    apiRoutes.community.createAnnouncement,
    payload,
  );
}

// — الدردشة والدليل (خام؛ النسخ المطبوعة أعلاه تبقى) —
export function fetchChatConversationsRaw(): Promise<unknown> {
  return apiClient.get<unknown>(apiRoutes.community.chat.conversations);
}

export function fetchCommunityUserRaw(id: string): Promise<unknown> {
  return apiClient.get<unknown>(apiRoutes.community.userById(id));
}

export function fetchChatMessagesRaw(chatUserId: string): Promise<unknown> {
  return apiClient.get<unknown>(apiRoutes.community.chat.messages(chatUserId));
}

export function sendChatMessageRaw(payload: RawPayload): Promise<unknown> {
  return apiClient.postJson<unknown>(apiRoutes.community.chat.sendMessage, payload);
}

export function fetchCommunityUsersRaw(): Promise<unknown> {
  return apiClient.get<unknown>(apiRoutes.community.users);
}
