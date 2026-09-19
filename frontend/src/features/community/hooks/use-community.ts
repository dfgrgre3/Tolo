"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryProfiles } from "@/lib/query/query-profiles";
import { useAuth } from "@/hooks/use-auth";
import * as communityApi from "../api/community-gateway";
import type { CreateAnnouncementRequest, SendMessageRequest } from "../domain/types";

// ─── مفاتيح الـ Query ─────────────────────────────────────────────

export const communityKeys = {
  announcements: () => ["community", "announcements"] as const,
  users: () => ["community", "users"] as const,
  user: (id: string) => ["community", "users", id] as const,
  conversations: () => ["community", "chat", "conversations"] as const,
  messages: (chatUserId: string) =>
    ["community", "chat", "messages", chatUserId] as const,
};

// ─── Hook: الإعلانات ──────────────────────────────────────────────

export function useAnnouncements() {
  return useQuery({
    queryKey: communityKeys.announcements(),
    queryFn: communityApi.fetchAnnouncements,
    ...queryProfiles.dashboard,
  });
}

// ─── Hook: مستخدمو المجتمع ────────────────────────────────────────

export function useCommunityUsers() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: communityKeys.users(),
    queryFn: communityApi.fetchCommunityUsers,
    enabled: isAuthenticated,
    ...queryProfiles.dashboard,
  });
}

export function useCommunityUser(userId: string) {
  return useQuery({
    queryKey: communityKeys.user(userId),
    queryFn: () => communityApi.fetchCommunityUserById(userId),
    enabled: !!userId,
    ...queryProfiles.static,
  });
}

// ─── Hook: الدردشة ────────────────────────────────────────────────

export function useChatConversations() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: communityKeys.conversations(),
    queryFn: communityApi.fetchChatConversations,
    enabled: isAuthenticated,
    ...queryProfiles.dashboard,
  });
}

export function useChatMessages(chatUserId: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: communityKeys.messages(chatUserId),
    queryFn: () => communityApi.fetchChatMessages(chatUserId),
    enabled: isAuthenticated && !!chatUserId,
    ...queryProfiles.dashboard,
  });
}

// ─── Mutations ────────────────────────────────────────────────────

export function useCreateAnnouncementMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateAnnouncementRequest) =>
      communityApi.createAnnouncement(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.announcements() });
    },
  });
}

export function useSendMessageMutation(chatUserId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: SendMessageRequest) =>
      communityApi.sendChatMessage(request),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: communityKeys.messages(chatUserId),
      });
      queryClient.invalidateQueries({ queryKey: communityKeys.conversations() });
    },
  });
}
