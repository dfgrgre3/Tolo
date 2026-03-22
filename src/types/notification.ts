
import { DateString } from './api/common';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  actionUrl?: string;
  link?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  actions?: Array<{ label: string; action: string; url?: string }>;
  icon?: string;
  createdAt: DateString;
  time?: string;
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
