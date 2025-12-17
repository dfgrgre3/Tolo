/**
 * Advanced Security Notification System with WebSocket Support
 * Real-time security alerts and notifications
 */

import { logger } from '@/lib/logger';
import { toast } from 'sonner';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';
export type NotificationType =
  | 'login_success'
  | 'login_failed'
  | 'new_device'
  | 'suspicious_activity'
  | 'password_changed'
  | 'two_factor_enabled'
  | 'two_factor_disabled'
  | 'session_expired'
  | 'account_locked'
  | 'security_alert';

export interface SecurityNotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionRequired: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  sms: boolean;
  types: {
    [key in NotificationType]?: boolean;
  };
}

export class SecurityNotificationSystem {
  private ws: WebSocket | null = null;
  private notifications: SecurityNotification[] = [];
  private listeners: Set<(notification: SecurityNotification) => void> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly storageKey = 'security_notifications';

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Initialize WebSocket connection
   */
  async connect(userId: string, token: string): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const wsUrl = this.getWebSocketUrl();
      this.ws = new WebSocket(`${wsUrl}?userId=${userId}&token=${token}`);

      this.ws.onopen = () => {
        logger.info('Security notification WebSocket connected');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          logger.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        logger.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        logger.info('WebSocket connection closed');
        this.stopHeartbeat();
        this.attemptReconnect(userId, token);
      };
    } catch (error) {
      logger.error('Failed to connect to WebSocket:', error);
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.stopHeartbeat();
  }

  /**
   * Send a notification
   */
  async sendNotification(
    notification: Omit<SecurityNotification, 'id' | 'timestamp' | 'read'>
  ): Promise<void> {
    const newNotification: SecurityNotification = {
      ...notification,
      id: this.generateId(),
      timestamp: new Date(),
      read: false,
    };

    this.notifications.unshift(newNotification);
    this.saveToStorage();

    // Notify listeners
    this.listeners.forEach((listener) => listener(newNotification));

    // Show toast notification
    this.showToastNotification(newNotification);

    // Send to server
    await this.sendToServer(newNotification);
  }

  /**
   * Get all notifications
   */
  getNotifications(filter?: {
    unreadOnly?: boolean;
    type?: NotificationType;
    priority?: NotificationPriority;
    limit?: number;
  }): SecurityNotification[] {
    let filtered = [...this.notifications];

    if (filter?.unreadOnly) {
      filtered = filtered.filter((n) => !n.read);
    }

    if (filter?.type) {
      filtered = filtered.filter((n) => n.type === filter.type);
    }

    if (filter?.priority) {
      filtered = filtered.filter((n) => n.priority === filter.priority);
    }

    if (filter?.limit) {
      filtered = filtered.slice(0, filter.limit);
    }

    return filtered;
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    const notification = this.notifications.find((n) => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.saveToStorage();
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    this.notifications.forEach((n) => (n.read = true));
    this.saveToStorage();
  }

  /**
   * Delete a notification
   */
  deleteNotification(notificationId: string): void {
    this.notifications = this.notifications.filter((n) => n.id !== notificationId);
    this.saveToStorage();
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    this.notifications = [];
    this.saveToStorage();
  }

  /**
   * Get unread count
   */
  getUnreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  /**
   * Subscribe to notifications
   */
  subscribe(listener: (notification: SecurityNotification) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  /**
   * Show browser notification
   */
  async showBrowserNotification(notification: SecurityNotification): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      try {
        const browserNotification = new Notification(notification.title, {
          body: notification.message,
          icon: '/icons/security-alert.png',
          badge: '/icons/badge.png',
          tag: notification.id,
          requireInteraction: notification.priority === 'critical',
          data: notification,
        });

        browserNotification.onclick = () => {
          window.focus();
          if (notification.actionUrl) {
            window.location.href = notification.actionUrl;
          }
          browserNotification.close();
        };
      } catch (error) {
        logger.error('Failed to show browser notification:', error);
      }
    }
  }

  // Private methods

  private handleWebSocketMessage(data: { type: string; notification: SecurityNotification }): void {
    if (data.type === 'notification') {
      const notification: SecurityNotification = {
        ...data.notification,
        timestamp: new Date(data.notification.timestamp),
      };

      this.notifications.unshift(notification);
      this.saveToStorage();

      // Notify listeners
      this.listeners.forEach((listener) => listener(notification));

      // Show toast notification
      this.showToastNotification(notification);

      // Show browser notification if enabled
      this.showBrowserNotification(notification);
    } else if (data.type === 'heartbeat') {
      // Respond to heartbeat
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'heartbeat_ack' }));
      }
    }
  }

  private showToastNotification(notification: SecurityNotification): void {
    const options = {
      duration: this.getToastDuration(notification.priority),
      action: notification.actionUrl
        ? {
          label: 'عرض',
          onClick: () => {
            window.location.href = notification.actionUrl!;
          },
        }
        : undefined,
    };

    switch (notification.priority) {
      case 'critical':
        toast.error(notification.message, options);
        break;
      case 'high':
        toast.warning(notification.message, options);
        break;
      case 'medium':
        toast.info(notification.message, options);
        break;
      case 'low':
        toast(notification.message, options);
        break;
    }
  }

  private getToastDuration(priority: NotificationPriority): number {
    switch (priority) {
      case 'critical':
        return 10000;
      case 'high':
        return 7000;
      case 'medium':
        return 5000;
      case 'low':
        return 3000;
    }
  }

  private getWebSocketUrl(): string {
    if (typeof window === 'undefined') return '';

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/api/ws/notifications`;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private attemptReconnect(userId: string, token: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    logger.info(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect(userId, token);
    }, delay);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.notifications = parsed.map((n: SecurityNotification) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        }));
      }
    } catch (error) {
      logger.error('Failed to load notifications from storage:', error);
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      // Keep only the last 100 notifications
      const toStore = this.notifications.slice(0, 100);
      localStorage.setItem(this.storageKey, JSON.stringify(toStore));
    } catch (error) {
      logger.error('Failed to save notifications to storage:', error);
    }
  }

  private async sendToServer(notification: SecurityNotification): Promise<void> {
    try {
      await fetch('/api/notifications/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification),
      });
    } catch (error) {
      logger.error('Failed to send notification to server:', error);
    }
  }
}

// Singleton instance
let notificationSystemInstance: SecurityNotificationSystem | null = null;

export function getSecurityNotificationSystem(): SecurityNotificationSystem {
  if (!notificationSystemInstance) {
    notificationSystemInstance = new SecurityNotificationSystem();
  }
  return notificationSystemInstance;
}

// Helper functions for common notifications

export function notifyLoginSuccess(deviceInfo?: string): void {
  const system = getSecurityNotificationSystem();
  system.sendNotification({
    type: 'login_success',
    priority: 'low',
    title: 'تسجيل دخول ناجح',
    message: deviceInfo
      ? `تم تسجيل الدخول بنجاح من ${deviceInfo}`
      : 'تم تسجيل الدخول بنجاح',
    actionRequired: false,
  });
}

export function notifyNewDevice(deviceInfo: string, location?: string): void {
  const system = getSecurityNotificationSystem();
  system.sendNotification({
    type: 'new_device',
    priority: 'high',
    title: 'جهاز جديد',
    message: `تم اكتشاف تسجيل دخول من جهاز جديد: ${deviceInfo}${location ? ` في ${location}` : ''}`,
    actionRequired: true,
    actionUrl: '/security/devices',
  });
}

export function notifySuspiciousActivity(reason: string): void {
  const system = getSecurityNotificationSystem();
  system.sendNotification({
    type: 'suspicious_activity',
    priority: 'critical',
    title: 'نشاط مشبوه',
    message: `تم اكتشاف نشاط مشبوه: ${reason}`,
    actionRequired: true,
    actionUrl: '/security/activity',
  });
}

export function notifyPasswordChanged(): void {
  const system = getSecurityNotificationSystem();
  system.sendNotification({
    type: 'password_changed',
    priority: 'high',
    title: 'تم تغيير كلمة المرور',
    message: 'تم تغيير كلمة المرور الخاصة بك بنجاح',
    actionRequired: false,
  });
}

export function notifyAccountLocked(reason: string, unlockTime?: Date): void {
  const system = getSecurityNotificationSystem();
  const unlockMessage = unlockTime
    ? ` سيتم فتح الحساب في ${unlockTime.toLocaleString('ar-SA')}`
    : '';
  system.sendNotification({
    type: 'account_locked',
    priority: 'critical',
    title: 'تم قفل الحساب',
    message: `تم قفل حسابك: ${reason}.${unlockMessage}`,
    actionRequired: true,
    actionUrl: '/security/unlock',
  });
}

