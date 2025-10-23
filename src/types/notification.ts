
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  actionUrl?: string;
  icon?: string;
  createdAt: string;
}

export interface NotificationTemplate {
  title: string;
  message: string;
  type: NotificationType;
  actionUrl?: string;
  icon?: string;
}

export interface NotificationPayload {
  title: string;
  message: string;
  type: NotificationType;
  actionUrl?: string;
  icon?: string;
}
