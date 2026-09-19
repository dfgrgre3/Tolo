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
