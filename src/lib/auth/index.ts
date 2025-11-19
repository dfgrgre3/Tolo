/**
 * Unified Authentication System
 * نظام المصادقة الموحد - نقطة التصدير الرئيسية
 * 
 * هذا الملف هو نقطة التصدير الموحدة لمجلد src/lib/auth/
 * جميع الملفات في هذا المجلد تشكل نظام المصادقة الموحد.
 * 
 * للاستخدام:
 * - للـ Unified Auth Manager: استورد getAuthManager أو authManager
 * - للـ Enhanced Middleware: استورد withEnhancedAuth
 * - للـ Session Sync: استورد getSessionSyncManager
 * - للـ Error Recovery: استورد getErrorRecoveryManager
 * 
 * الملفات في هذا المجلد:
 * - unified-auth-manager.ts: مدير المصادقة الموحد
 * - enhanced-middleware.ts: Middleware محسّن للمصادقة (server-side)
 * - session-sync.ts: مزامنة الجلسات بين التبويبات
 * - error-recovery.ts: استعادة الأخطاء وإدارة المحاولات
 * - compatibility.ts: طبقة التوافق للأنظمة القديمة
 * 
 * الملفات الرئيسية الأخرى:
 * - src/auth.ts: نقطة التصدير الموحدة للمصادقة على الخادم (server-only)
 * - src/lib/auth-service.ts: الخدمة الأساسية للمصادقة (server-side)
 * - src/lib/api/auth-client.ts: عميل API للمصادقة (client-side)
 */

// Unified Auth Manager
export { getAuthManager, default as authManager } from './unified-auth-manager';
export type { AuthState, AuthEvent } from './unified-auth-manager';

// Session Sync
export { getSessionSyncManager, default as sessionSync } from './session-sync';
export type { SyncMessage } from './session-sync';

// Error Recovery
export { getErrorRecoveryManager, default as errorRecovery } from './error-recovery';
export type { RetryOptions, ErrorContext } from './error-recovery';

// Enhanced Middleware
export {
  withEnhancedAuth,
  createEnhancedAuthHandler,
  requireRole,
  requireAdmin,
} from './enhanced-middleware';
export type { EnhancedAuthOptions, EnhancedAuthResult } from './enhanced-middleware';

