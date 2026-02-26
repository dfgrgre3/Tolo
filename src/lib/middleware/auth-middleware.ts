/**
 * Auth Middleware - Unified Export
 * ===================================================
 * ⚠️ لا تستخدم هذا الملف في كود جديد.
 * ✅ استخدم بدلاً منه: '@/lib/auth/enhanced-middleware'
 *
 * هذا الملف موجود فقط للـ backward compatibility
 * مع الـ routes القديمة التي تستورد من هذا المسار.
 *
 * الـ enhanced-middleware هو الملف الأصلي الموحد ويحتوي على:
 * - retry logic
 * - error recovery
 * - timeout protection
 * - دعم emailVerified check
 */

// Re-export everything from the canonical enhanced-middleware
export {
  withEnhancedAuth as withAuth,
  withEnhancedAuth,
  createEnhancedAuthHandler as createAuthHandler,
  createEnhancedAuthHandler,
  requireRole,
  requireAdmin,
  type EnhancedAuthOptions as AuthMiddlewareOptions,
  type EnhancedAuthOptions,
  type EnhancedAuthResult,
} from '@/lib/auth/enhanced-middleware';

// Re-export types from auth-service for backward compatibility
export type { TokenVerificationResult, AuthUser } from '@/lib/services/auth-service';

// AuthenticatedRequest type for backward compatibility
import type { NextRequest } from 'next/server';
import type { TokenVerificationResult } from '@/lib/services/auth-service';

export interface AuthenticatedRequest extends NextRequest {
  user?: NonNullable<TokenVerificationResult['user']>;
  sessionId?: string;
}
