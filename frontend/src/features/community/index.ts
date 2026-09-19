/**
 * Community Feature — Public API
 *
 * الواجهة العامة لنطاق المجتمع والإعلانات والدردشة.
 */

// Domain types
export type {
  Announcement,
  CreateAnnouncementRequest,
  CommunityUser,
  ChatConversation,
  ChatMessage,
  SendMessageRequest,
} from "./domain/types";

// API gateway
export {
  fetchAnnouncements,
  createAnnouncement,
  fetchCommunityUsers,
  fetchCommunityUserById,
  fetchChatConversations,
  fetchChatMessages,
  sendChatMessage,
} from "./api/community-gateway";

// Hooks
export {
  communityKeys,
  useAnnouncements,
  useCommunityUsers,
  useCommunityUser,
  useChatConversations,
  useChatMessages,
  useCreateAnnouncementMutation,
  useSendMessageMutation,
} from "./hooks/use-community";
