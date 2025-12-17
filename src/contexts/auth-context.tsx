/**
 * ============================================
 * ⭐ نقطة التصدير الموحدة لنظام المصادقة (Client-Side)
 * ============================================
 * 
 * هذا هو المصدر الوحيد الموثوق (Single Source of Truth) لجميع hooks و components المصادقة على العميل
 * 
 * ⚠️ IMPORTANT - البنية الموحدة بدون تضارب:
 * 
 * 📁 CLIENT-SIDE (العميل):
 *   ✅ src/contexts/auth-context.tsx → هذا الملف (المصدر الموحد) ⭐
 *      └─> src/components/auth/UnifiedAuthProvider.tsx (التنفيذ)
 *          └─> src/lib/auth/unified-auth-manager.ts (إدارة الحالة)
 *   
 *   🔄 طبقات التوافق (Compatibility Layers):
 *      - src/components/auth/UserProvider.tsx → يعتمد على UnifiedAuthProvider
 *      - src/lib/auth/compatibility.ts → يعتمد على useUnifiedAuth
 *      - src/lib/auth-hook-enhanced.ts → يعتمد على useUnifiedAuth
 * 
 * 📁 SERVER-SIDE (الخادم):
 *   ✅ src/auth.ts → نقطة التصدير الموحدة (server-only) ⭐
 *      └─> src/lib/auth-service.ts (الخدمة الأساسية)
 * 
 * 📁 API CLIENT:
 *   ✅ src/lib/api/auth-client.ts → عميل API للعميل
 * 
 * 📖 للاستخدام:
 *   ✅ في Client Components: 
 *      import { useUnifiedAuth } from '@/contexts/auth-context'
 *   
 *   ✅ في Server Components: 
 *      import { auth } from '@/auth'
 *   
 *   ✅ في API Routes: 
 *      import { authService } from '@/lib/services/auth-service'
 * 
 * 📚 راجع AUTH_STRUCTURE_UNIFIED.md للتفاصيل الكاملة
 */

"use client";

// ============================================
// ✅ النظام الموحد (Unified Auth System) - المصدر الأساسي
// ============================================
// هذا هو النظام الموصى به والوحيد الموثوق
export { UnifiedAuthContext, useUnifiedAuth, UnifiedAuthProvider } from "@/app/(auth)/components/UnifiedAuthProvider";
export type { UnifiedAuthContextType } from "@/app/(auth)/components/UnifiedAuthProvider";
export type { User } from "@/app/(auth)/components/UnifiedAuthProvider";

// ============================================
// ⚠️ النظام القديم (Legacy System) - REMOVED
// ============================================
// ❌ تم إزالة التصديرات القديمة (useAuth, AuthProvider) من هذا الملف لتجنب التضارب
// ✅ استخدم useUnifiedAuth و UnifiedAuthProvider بدلاً منها
// 
// للترقية:
// - استبدل useAuth() بـ useUnifiedAuth()
// - استبدل AuthProvider بـ UnifiedAuthProvider
// - راجع AUTH_STRUCTURE_UNIFIED.md للتفاصيل
// 
// ⚠️ إذا كنت تحتاج للوصول إلى النظام القديم للترقية التدريجية:
// يمكنك استيراده مباشرة من: @/components/auth/UserProvider
// أو من: @/hooks/use-auth (يستخدم useUnifiedAuth داخلياً)
// لكن يُنصح بشدة بالترقية إلى النظام الموحد

// Re-export User type from UnifiedAuthProvider as the primary source
export type { User as AuthUser } from "@/app/(auth)/components/UnifiedAuthProvider";