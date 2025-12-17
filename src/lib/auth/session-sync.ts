/**
 * Session Synchronization
 * مزامنة الجلسات عبر التبويبات والأجهزة
 * 
 * يوفر:
 * - مزامنة تلقائية عبر التبويبات
 * - إشعارات عند تسجيل الدخول/الخروج من تبويب آخر
 * - مزامنة الحالة في الوقت الفعلي
 */

import { EventEmitter } from 'events';
import { logger } from '@/lib/logger';
import type { AuthUser } from '@/lib/services/auth-service';
import type { AuthState } from './unified-auth-manager';

export interface SyncMessage {
  type: 'login' | 'logout' | 'state_update' | 'token_refresh' | 'session_expired';
  data?: unknown;
  timestamp: number;
  tabId: string;
}

class SessionSyncManager extends EventEmitter {
  private channel: BroadcastChannel | null = null;
  private storage: Storage | null = null;
  private tabId: string;
  private isInitialized = false;

  constructor() {
    super();
    this.tabId = this.generateTabId();

    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  /**
   * توليد معرف فريد للتبويب
   */
  private generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * تهيئة النظام
   */
  private initialize() {
    if (this.isInitialized) return;

    // إعداد BroadcastChannel
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('auth-session-sync');
      this.channel.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    }

    // إعداد localStorage للاستماع للتغييرات
    if (typeof window !== 'undefined') {
      this.storage = window.localStorage;
      window.addEventListener('storage', (event) => {
        this.handleStorageChange(event);
      });
    }

    // إشعار التبويبات الأخرى بوجود هذا التبويب
    this.broadcast({
      type: 'state_update',
      data: { action: 'tab_opened', tabId: this.tabId },
      timestamp: Date.now(),
      tabId: this.tabId,
    } as SyncMessage);

    // مراقبة إغلاق التبويب
    window.addEventListener('beforeunload', () => {
      this.broadcast({
        type: 'state_update',
        data: { action: 'tab_closed', tabId: this.tabId },
        timestamp: Date.now(),
        tabId: this.tabId,
      } as SyncMessage);
    });

    this.isInitialized = true;
  }

  /**
   * معالجة الرسائل من التبويبات الأخرى
   */
  private handleMessage(message: SyncMessage) {
    // تجاهل الرسائل من نفس التبويب
    if (message.tabId === this.tabId) {
      return;
    }

    logger.debug('Received sync message:', message);

    switch (message.type) {
      case 'login':
        this.emit('login', message.data);
        break;

      case 'logout':
        this.emit('logout', message.data);
        break;

      case 'state_update':
        this.emit('state_update', message.data);
        break;

      case 'token_refresh':
        this.emit('token_refresh', message.data);
        break;

      case 'session_expired':
        this.emit('session_expired', message.data);
        break;
    }
  }

  /**
   * معالجة تغييرات localStorage
   */
  private handleStorageChange(event: StorageEvent) {
    if (event.key === 'auth_state' && event.newValue) {
      try {
        const newState = JSON.parse(event.newValue);
        this.emit('storage_update', newState);
      } catch (error) {
        logger.error('Failed to parse storage update:', error);
      }
    }
  }

  /**
   * إرسال رسالة للتبويبات الأخرى
   */
  broadcast(message: Omit<SyncMessage, 'tabId'>) {
    const fullMessage: SyncMessage = {
      ...message,
      tabId: this.tabId,
    };

    // إرسال عبر BroadcastChannel
    if (this.channel) {
      this.channel.postMessage(fullMessage);
    }

    // تحديث localStorage لإشعار التبويبات الأخرى
    if (this.storage) {
      try {
        this.storage.setItem('auth_sync_timestamp', Date.now().toString());
        this.storage.setItem('auth_sync_data', JSON.stringify(fullMessage));
      } catch (error) {
        logger.error('Failed to update storage:', error);
      }
    }
  }

  /**
   * إشعار بتسجيل الدخول
   */
  notifyLogin(userData: AuthUser) {
    this.broadcast({
      type: 'login',
      data: { user: userData },
      timestamp: Date.now(),
    });
  }

  /**
   * إشعار بتسجيل الخروج
   */
  notifyLogout() {
    this.broadcast({
      type: 'logout',
      timestamp: Date.now(),
    });
  }

  /**
   * إشعار بتحديث الحالة
   */
  notifyStateUpdate(state: AuthState) {
    this.broadcast({
      type: 'state_update',
      data: { state },
      timestamp: Date.now(),
    });
  }

  /**
   * إشعار بتحديث التوكن
   */
  notifyTokenRefresh() {
    this.broadcast({
      type: 'token_refresh',
      timestamp: Date.now(),
    });
  }

  /**
   * إشعار بانتهاء الجلسة
   */
  notifySessionExpired() {
    this.broadcast({
      type: 'session_expired',
      timestamp: Date.now(),
    });
  }

  /**
   * الحصول على معرف التبويب
   */
  getTabId(): string {
    return this.tabId;
  }

  /**
   * تنظيف الموارد
   */
  destroy() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }

    this.removeAllListeners();
    this.isInitialized = false;
  }
}

// Singleton instance
let syncManagerInstance: SessionSyncManager | null = null;

export function getSessionSyncManager(): SessionSyncManager {
  if (typeof window === 'undefined') {
    // في SSR، نعيد instance وهمي
    return {
      broadcast: () => { },
      notifyLogin: () => { },
      notifyLogout: () => { },
      notifyStateUpdate: () => { },
      notifyTokenRefresh: () => { },
      notifySessionExpired: () => { },
      getTabId: () => 'ssr',
      on: ((event: string, listener: (...args: unknown[]) => void): SessionSyncManager => {
        return {} as SessionSyncManager;
      }) as (event: string, listener: (...args: unknown[]) => void) => SessionSyncManager,
      off: () => { },
      emit: () => false,
      destroy: () => { },
    } as any;
  }

  if (!syncManagerInstance) {
    syncManagerInstance = new SessionSyncManager();
  }

  return syncManagerInstance;
}

export default getSessionSyncManager;

