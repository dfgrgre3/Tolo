import { DateString } from './api/common';

export type UINotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: UINotificationType;
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
  type: UINotificationType;
  actionUrl?: string;
  icon?: string;
}

export interface NotificationPayload {
  title: string;
  message: string;
  type: UINotificationType;
  actionUrl?: string;
  icon?: string;
}
