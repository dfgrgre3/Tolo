import { DateString } from './api/common';
import { NotificationType } from './enums';

export interface NotificationAction {
  label: string;
  action: string;
  url?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'LOW' | 'MEDIUM' | 'HIGH';
  icon?: string | null;
  link?: string | null;
  actions?: NotificationAction[] | string[] | null;
  isRead: boolean;
  createdAt: DateString;
  updatedAt?: DateString;
}

export interface NotificationTemplate {
  title: string;
  message: string;
  type: NotificationType;
  icon?: string;
}

export interface NotificationPayload {
  title: string;
  message: string;
  type: NotificationType;
  icon?: string;
}
