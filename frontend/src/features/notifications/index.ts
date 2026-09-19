/**
 * Notifications Feature — Public API
 *
 * الواجهة العامة لنطاق الإشعارات.
 */

// Domain types
export type {
  Notification,
  NotificationAction,
  NotificationTemplate,
  NotificationPayload,
} from "@/types/notification";

// API gateway
export {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "./api/notifications-gateway";

// Hooks
export {
  notificationKeys,
  useNotifications,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from "./hooks/use-notifications";
