import { DateString } from './api/common';

type UINotificationType = 'info' | 'success' | 'warning' | 'error';

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

interface NotificationTemplate {
  title: string;
  message: string;
  type: UINotificationType;
  actionUrl?: string;
  icon?: string;
}

interface NotificationPayload {
  title: string;
  message: string;
  type: UINotificationType;
  actionUrl?: string;
  icon?: string;
}
