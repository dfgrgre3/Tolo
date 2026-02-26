/**
 * ============================================
 * مدير المصادقة الموحد (Unified Auth Manager)
 * ============================================
 * 
 * ⚠️ IMPORTANT: هذا ملف داخلي - لا تستورده مباشرة
 * ✅ استخدم useUnifiedAuth من @/contexts/auth-context
 * 
 * ⚠️ IMPORTANT - البنية الموحدة:
 * 
 * 📁 CLIENT-SIDE (العميل):
 *   ✅ src/contexts/auth-context.tsx → نقطة التصدير الموحدة ⭐
 *      └─> src/components/auth/UnifiedAuthProvider.tsx
 *          └─> هذا الملف (التنفيذ الداخلي)
 * 
 * 📖 للاستخدام:
 *   ✅ في Client Components: 
 *      import { useUnifiedAuth } from '@/contexts/auth-context'
 *      (لا تستورد من هذا الملف مباشرة)
 * 
 * 📚 راجع AUTH_STRUCTURE_UNIFIED.md للتفاصيل الكاملة
 */

import { EventEmitter } from 'events';
import { logger } from '@/lib/logger';
import { getSessionSyncManager } from './session-sync';
import { createAuthFetchInterceptor } from '@/lib/token-refresh-interceptor';
import type { User } from '@/types/api/auth';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionId: string | null;
  lastActivity: number;
  tokenExpiry: number | null;
}

export interface AuthEvent {
  type: 'login' | 'logout' | 'token_refresh' | 'session_expired' | 'error' | 'state_change';
  data?: unknown;
  timestamp: number;
}

class UnifiedAuthManager extends EventEmitter {
  private state: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    sessionId: null,
    lastActivity: Date.now(),
    tokenExpiry: null,
  };

  private refreshTimer: NodeJS.Timeout | null = null;
  private activityTimer: NodeJS.Timeout | null = null;
  private syncChannel: BroadcastChannel | null = null;
  private sessionSync: ReturnType<typeof getSessionSyncManager> | null = null;
  private interceptorCleanup: (() => void) | null = null;
  private isInitialized = false;

  constructor() {
    super();
    this.setMaxListeners(50); // Allow many listeners

    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  /**
   * تهيئة النظام
   */
  private initialize() {
    if (this.isInitialized) return;

    // إعداد BroadcastChannel للمزامنة عبر التبويبات
    if (typeof BroadcastChannel !== 'undefined') {
      this.syncChannel = new BroadcastChannel('auth-sync');
      this.syncChannel.onmessage = (event) => {
        this.handleSyncMessage(event.data);
      };
    }

    // إعداد Session Sync Manager
    this.sessionSync = getSessionSyncManager();
    this.sessionSync.on('login', (data) => {
      if (data?.user) {
        this.setState({
          user: data.user,
          isAuthenticated: true,
        });
      }
    });
    this.sessionSync.on('logout', () => {
      this.setState({
        user: null,
        isAuthenticated: false,
        sessionId: null,
      });
    });
    this.sessionSync.on('state_update', (data) => {
      if (data?.state) {
        this.setState(data.state);
      }
    });

    // إعداد مراقبة النشاط
    this.setupActivityMonitoring();

    // إعداد مراقبة الاتصال
    this.setupConnectionMonitoring();

    // إعداد Interceptor لتحديث التوكن تلقائياً عند 401
    this.interceptorCleanup = createAuthFetchInterceptor();

    // استعادة الحالة من localStorage
    this.restoreState();

    this.isInitialized = true;
    this.emit('initialized');
  }

  /**
   * استعادة الحالة من التخزين المحلي
   */
  private restoreState() {
    try {
      const stored = localStorage.getItem('auth_state');
      let restored = false;

      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.user && parsed.isAuthenticated) {
          this.state = {
            ...this.state,
            ...parsed,
            isLoading: false,
          };
          this.emit('state_change', { state: this.state });
          restored = true;
        }
      }

      if (!restored) {
        // If no valid state found, ensure we're not stuck in loading
        this.state = {
          ...this.state,
          isLoading: false,
        };
        this.emit('state_change', { state: this.state });
      }
    } catch (error) {
      logger.error('Failed to restore auth state:', error);
      // Ensure we're not stuck in loading on error
      this.state = {
        ...this.state,
        isLoading: false,
      };
      this.emit('state_change', { state: this.state });
    }
  }

  /**
   * حفظ الحالة في التخزين المحلي
   */
  private persistState() {
    try {
      const stateToSave = {
        user: this.state.user,
        isAuthenticated: this.state.isAuthenticated,
        sessionId: this.state.sessionId,
        tokenExpiry: this.state.tokenExpiry,
      };
      localStorage.setItem('auth_state', JSON.stringify(stateToSave));
    } catch (error) {
      logger.error('Failed to persist auth state:', error);
    }
  }

  /**
   * إعداد مراقبة النشاط
   */
  private setupActivityMonitoring() {
    if (typeof window === 'undefined') return;

    const updateActivity = () => {
      this.state.lastActivity = Date.now();
    };

    // مراقبة أحداث المستخدم
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    // تحديث النشاط كل دقيقة
    this.activityTimer = setInterval(() => {
      if (this.state.isAuthenticated) {
        this.state.lastActivity = Date.now();
      }
    }, 60000);
  }

  /**
   * إعداد مراقبة الاتصال
   */
  private setupConnectionMonitoring() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.emit('connection_restored');
      this.syncWithServer();
    });

    window.addEventListener('offline', () => {
      this.emit('connection_lost');
    });
  }

  /**
   * معالجة رسائل المزامنة من التبويبات الأخرى
   */
  private handleSyncMessage(data: AuthEvent) {
    if (data.type === 'login' || data.type === 'logout') {
      // مزامنة الحالة مع التبويبات الأخرى
      this.syncWithServer();
    } else if (data.type === 'state_change') {
      // تحديث الحالة من تبويب آخر
      const eventData = data.data as any;
      if (eventData?.state) {
        this.state = { ...this.state, ...eventData.state };
        this.emit('state_change', { state: this.state, source: 'sync' });
      }
    }
  }

  /**
   * إرسال حدث للمزامنة عبر التبويبات
   */
  private broadcastEvent(event: AuthEvent) {
    if (this.syncChannel) {
      this.syncChannel.postMessage(event);
    }
  }

  /**
   * مزامنة الحالة مع الخادم
   * يضمن التكامل الكامل بين الواجهة الأمامية والخلفية
   */
  async syncWithServer(): Promise<void> {
    try {
      // التحقق من حالة المصادقة من الخادم
      // التوكن في httpOnly cookie - لا حاجة لإرسال Authorization header
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // مهم: إرسال cookies
          cache: 'no-store',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          const isJson = contentType?.includes('application/json');

          if (isJson) {
            const data = await response.json();
            if (data.user) {
              // تحديث الحالة من الخادم
              this.setState({
                user: data.user,
                isAuthenticated: true,
                isLoading: false,
              });
              return;
            }
          }
        } else if (response.status === 401) {
          // انتهت الجلسة - مسح الحالة
          this.handleSessionExpired();
        } else if (response.status >= 500) {
          // خطأ في الخادم - لا نغير الحالة
          logger.warn('Server error during sync:', response.status);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      // خطأ في الاتصال - لا نغير الحالة المحلية
      // قد يكون خطأ مؤقت في الشبكة
      logger.warn('Failed to sync with server:', error);

      // إذا كان المستخدم مسجلاً دخولاً محلياً، نحتفظ بالحالة
      // وإلا نمسح الحالة
      if (!this.state.user) {
        this.setState({
          isAuthenticated: false,
          isLoading: false,
        });
      }
    }
  }

  /**
   * تعيين الحالة
   */
  setState(updates: Partial<AuthState>) {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...updates };

    // حفظ الحالة
    if (this.state.isAuthenticated) {
      this.persistState();
    } else {
      localStorage.removeItem('auth_state');
    }

    // إرسال حدث التغيير
    this.emit('state_change', {
      state: this.state,
      previousState: oldState
    });

    // مزامنة عبر التبويبات
    this.broadcastEvent({
      type: 'state_change',
      data: { state: this.state },
      timestamp: Date.now(),
    });

    // إشعار Session Sync Manager
    this.sessionSync?.notifyStateUpdate(this.state);
  }

  /**
   * الحصول على الحالة الحالية
   */
  getState(): AuthState {
    return { ...this.state };
  }

  /**
   * تسجيل الدخول
   * يضمن التكامل الكامل مع الخادم
   * التوكن يتم حفظه في httpOnly cookie من الخادم
   * محسّن مع تحقق شامل من البيانات والأمان
   */
  async login(token: string, userData: User, sessionId?: string): Promise<void> {
    try {
      // Enhanced validation with comprehensive checks
      if (!userData || typeof userData !== 'object' || Array.isArray(userData)) {
        throw new Error('Invalid user data: must be an object');
      }

      if (!userData.id || typeof userData.id !== 'string' || userData.id.trim().length === 0) {
        throw new Error('Invalid user data: user ID is required');
      }

      if (!userData.email || typeof userData.email !== 'string' || userData.email.trim().length === 0) {
        throw new Error('Invalid user data: user email is required');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const normalizedEmail = userData.email.trim().toLowerCase();
      if (!emailRegex.test(normalizedEmail) || normalizedEmail.length > 254) {
        throw new Error('Invalid user data: invalid email format');
      }

      // Validate token format if provided
      if (token && typeof token === 'string') {
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3 || tokenParts.some(part => part.length === 0)) {
          logger.warn('Invalid token format provided to login');
        }
      }

      // Validate session ID format if provided
      if (sessionId !== undefined) {
        if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
          logger.warn('Invalid session ID format provided to login');
          sessionId = undefined;
        }
      }

      // تحديث الحالة المحلية
      this.setState({
        user: userData,
        isAuthenticated: true,
        isLoading: false,
        sessionId: sessionId || null,
        lastActivity: Date.now(),
      });

      // مزامنة مع الخادم للتأكد من التكامل
      // التوكن موجود في httpOnly cookie من استجابة تسجيل الدخول
      try {
        await this.syncWithServer();
      } catch (syncError) {
        // إذا فشلت المزامنة، نستمر بالحالة المحلية
        // قد يكون خطأ مؤقت
        logger.warn('Initial sync after login failed, but login succeeded:', syncError);
      }

      // إرسال حدث تسجيل الدخول
      this.emit('login', { user: userData });
      this.broadcastEvent({
        type: 'login',
        data: { user: userData },
        timestamp: Date.now(),
      });

      // إشعار Session Sync Manager
      this.sessionSync?.notifyLogin(userData);

      // إعداد تحديث التوكن التلقائي
      this.setupTokenRefresh();
    } catch (error) {
      logger.error('Login error:', error);
      this.emit('error', { type: 'login_error', error });
      throw error;
    }
  }

  /**
   * تسجيل الخروج
   * يضمن التكامل الكامل مع الخادم
   * يمسح التوكن من httpOnly cookie
   */
  async logout(): Promise<void> {
    try {
      // محاولة تسجيل الخروج من الخادم (with timeout)
      // الخادم سيمسح التوكن من httpOnly cookie
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // مهم: إرسال cookies
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok && response.status !== 401) {
          // إذا لم يكن 401 (غير مصرح)، سجل التحذير في development فقط
          if (process.env.NODE_ENV === 'development') {
            logger.debug('Logout API returned non-OK status:', response.status);
          }
        }
      } catch (error) {
        // تجاهل الأخطاء - سنمسح الحالة المحلية على أي حال
        // فقط سجل في development
        if (process.env.NODE_ENV === 'development') {
          logger.debug('Logout API call failed (non-critical):', error);
        }
      }

      // مسح الحالة المحلية
      this.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        sessionId: null,
        tokenExpiry: null,
      });

      // إيقاف التحديث التلقائي
      this.clearTokenRefresh();

      // إرسال حدث تسجيل الخروج
      this.emit('logout');
      this.broadcastEvent({
        type: 'logout',
        timestamp: Date.now(),
      });

      // إشعار Session Sync Manager
      this.sessionSync?.notifyLogout();
    } catch (error) {
      logger.error('Logout error:', error);
      this.emit('error', { type: 'logout_error', error });

      // حتى في حالة الخطأ، نمسح الحالة المحلية
      this.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        sessionId: null,
        tokenExpiry: null,
      });
    }
  }

  /**
   * تحديث بيانات المستخدم
   */
  updateUser(userData: Partial<User>) {
    if (this.state.user) {
      this.setState({
        user: { ...this.state.user, ...userData },
      });
    }
  }

  /**
   * إعداد تحديث التوكن التلقائي
   * يضمن بقاء الجلسة نشطة
   * التوكن يتم تحديثه في httpOnly cookie من الخادم
   */
  private setupTokenRefresh() {
    this.clearTokenRefresh();

    // التحقق كل 5 دقائق
    this.refreshTimer = setInterval(async () => {
      if (!this.state.isAuthenticated) {
        this.clearTokenRefresh();
        return;
      }

      try {
        // تحديث التوكن من الخادم
        // التوكن في httpOnly cookie - يتم تحديثه تلقائياً
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // مهم: إرسال cookies
        });

        if (response.ok) {
          // التوكن تم تحديثه في cookie
          this.emit('token_refresh', { success: true });
          this.broadcastEvent({
            type: 'token_refresh',
            timestamp: Date.now(),
          });

          // إشعار Session Sync Manager
          this.sessionSync?.notifyTokenRefresh();
        } else if (response.status === 401) {
          // انتهت الجلسة
          this.handleSessionExpired();
        } else {
          logger.warn('Token refresh returned non-OK status:', response.status);
        }
      } catch (error) {
        logger.warn('Token refresh failed:', error);
        // لا نفعل شيء - قد يكون خطأ مؤقت في الشبكة
        // سنحاول مرة أخرى في الدورة القادمة
      }
    }, 5 * 60 * 1000); // كل 5 دقائق
  }

  /**
   * إيقاف تحديث التوكن
   */
  private clearTokenRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * معالجة انتهاء الجلسة
   */
  private handleSessionExpired() {
    this.setState({
      user: null,
      isAuthenticated: false,
      sessionId: null,
      tokenExpiry: null,
    });

    this.clearTokenRefresh();

    this.emit('session_expired');
    this.broadcastEvent({
      type: 'session_expired',
      timestamp: Date.now(),
    });
  }

  /**
   * التحقق من حالة المصادقة
   * يتحقق من الخادم للتأكد من صحة الجلسة
   * التوكن في httpOnly cookie - لا حاجة لإرسال Authorization header
   */
  async checkAuth(): Promise<boolean> {
    try {
      // التحقق من الخادم دائماً
      // التوكن في httpOnly cookie - يتم إرساله تلقائياً
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // مهم: إرسال cookies
          cache: 'no-store',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          const isJson = contentType?.includes('application/json');

          if (isJson) {
            const data = await response.json();
            if (data.user) {
              // تحديث الحالة من الخادم
              this.setState({
                user: data.user,
                isAuthenticated: true,
                isLoading: false,
              });
              return true;
            }
          }
        } else if (response.status === 401) {
          // انتهت الجلسة - مسح الحالة
          this.handleSessionExpired();
          return false;
        } else if (response.status >= 500) {
          // خطأ في الخادم - نعيد الحالة المحلية
          logger.warn('Server error during auth check:', response.status);
          return this.state.isAuthenticated;
        }

        // حالة أخرى - نمسح الحالة
        this.handleSessionExpired();
        return false;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      logger.warn('Auth check failed:', error);
      // في حالة الخطأ (مثل انقطاع الشبكة)، نعيد الحالة المحفوظة
      // قد يكون خطأ مؤقت
      return this.state.isAuthenticated;
    }
  }

  /**
   * تنظيف الموارد
   */
  destroy() {
    this.clearTokenRefresh();

    if (this.activityTimer) {
      clearInterval(this.activityTimer);
      this.activityTimer = null;
    }

    if (this.syncChannel) {
      this.syncChannel.close();
      this.syncChannel = null;
    }

    if (this.interceptorCleanup) {
      this.interceptorCleanup();
      this.interceptorCleanup = null;
    }

    this.removeAllListeners();
    this.isInitialized = false;
  }
}

// إنشاء instance واحد فقط (Singleton)
let authManagerInstance: UnifiedAuthManager | null = null;

export function getAuthManager(): UnifiedAuthManager {
  if (typeof window === 'undefined') {
    // في SSR، نعيد instance وهمي
    return {
      getState: () => ({
        user: null,
        isAuthenticated: false,
        isLoading: true,
        sessionId: null,
        lastActivity: Date.now(),
        tokenExpiry: null,
      }),
      setState: () => { },
      login: async () => { },
      logout: async () => { },
      updateUser: () => { },
      checkAuth: async () => false,
      on: ((event: string, listener: (...args: unknown[]) => void): UnifiedAuthManager => {
        return {} as UnifiedAuthManager;
      }) as (event: string, listener: (...args: unknown[]) => void) => UnifiedAuthManager,
      emit: () => false,
      destroy: () => { },
    } as any;
  }

  if (!authManagerInstance) {
    authManagerInstance = new UnifiedAuthManager();
  }

  return authManagerInstance;
}

export default getAuthManager;

