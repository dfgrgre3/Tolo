/**
 * ============================================
 * ⭐ نقطة التصدير الموحدة للمصادقة (Server-Side Only)
 * ============================================
 * 
 * هذا هو المصدر الوحيد الموثوق للمصادقة على الخادم
 * 
 * ⚠️ IMPORTANT - البنية الموحدة بدون تضارب:
 * 
 * 📁 SERVER-SIDE (الخادم):
 *   ✅ src/auth.ts → هذا الملف (المصدر الموحد) ⭐
 *      └─> src/lib/auth-service.ts (الخدمة الأساسية)
 * 
 * 📁 CLIENT-SIDE (العميل):
 *   ✅ src/contexts/auth-context.tsx → نقطة التصدير الموحدة ⭐
 *      └─> src/components/auth/UnifiedAuthProvider
 *          └─> src/lib/auth/unified-auth-manager.ts
 * 
 * 📖 للاستخدام:
 *   ✅ في Server Components: 
 *      import { auth } from '@/auth'
 *   
 *   ✅ في API Routes: 
 *      import { authService } from '@/lib/services/auth-service'
 *   
 *   ✅ في Client Components: 
 *      import { useUnifiedAuth } from '@/contexts/auth-context'
 * 
 * 📚 راجع AUTH_STRUCTURE_UNIFIED.md للتفاصيل الكاملة
 */

import 'server-only';
import { logger } from '@/lib/logger';
import { authService } from '@/lib/services/auth-service';

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
