/**
 * Unified Authentication Export
 * نقطة التصدير الموحدة للمصادقة
 * 
 * ⭐ هذا هو المصدر الوحيد الموثوق للمصادقة على الخادم (Server-Side Only)
 * 
 * ⚠️ IMPORTANT - لا تضارب في الملفات:
 * - ❌ src/auth-server.ts → تم دمجه في هذا الملف (لم يعد موجوداً)
 * - ✅ src/auth.ts → هذا الملف (المصدر الموحد)
 * 
 * هذا الملف هو المصدر الوحيد الموحد لتصدير وظائف المصادقة على مستوى الخادم.
 * تم دمج src/auth.ts و src/auth-server.ts في هذا الملف لتجنب التضارب.
 * 
 * للاستخدام:
 * - ✅ على الخادم (Server Components): استورد auth من هذا الملف
 * - ✅ على الخادم (API Routes): استورد authService مباشرة من @/lib/auth-service
 * - ✅ على العميل: استخدم hooks من @/components/auth أو @/lib/auth-hook-enhanced
 * 
 * المصدر الأساسي: src/lib/auth-service.ts
 * 
 * راجع AUTH_STRUCTURE_CLEAN.md للتفاصيل الكاملة
 */

import 'server-only';
import { logger } from '@/lib/logger';
import { authService } from '@/lib/auth-service';

/**
 * Server-side auth function
 * Gets current authenticated user from cookies
 * 
 * @returns User object with id, email, name, role, and sessionId, or null if not authenticated
 */
export const auth = async () => {
  try {
    // Use auth-service to get current user from cookies
    const result = await authService.getCurrentUser();
    
    if (!result.isValid || !result.user) {
      return null;
    }

    // Return in format compatible with next-auth for backward compatibility
    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name || null,
        role: result.user.role || null,
      },
      sessionId: result.sessionId,
    };
  } catch (error) {
    logger.error('Auth error:', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

// Export default for backward compatibility
export default auth;

// Compatibility exports for signIn and signOut
// Note: These are placeholders for backward compatibility
// Actual authentication should use the auth API routes directly
export const signIn = async (...args: any[]) => {
  // Placeholder for backward compatibility
  // Use /api/auth/login API route instead
  return { error: 'Not implemented. Use /api/auth/login API route instead.', ok: false };
}

export const signOut = async (...args: any[]) => {
  // Placeholder for backward compatibility
  // Use /api/auth/logout API route instead
  return { error: 'Not implemented. Use /api/auth/logout API route instead.', ok: false };
}
