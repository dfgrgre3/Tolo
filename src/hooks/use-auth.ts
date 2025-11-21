"use client";

/**
 * ============================================
 * ⚠️ DEPRECATED - استخدم @/contexts/auth-context بدلاً من ذلك
 * ============================================
 * 
 * هذا الملف موجود للتوافق مع الكود القديم فقط
 * 
 * ⚠️ تحذير: useAuth لم يعد متاحاً من @/contexts/auth-context
 * ✅ استخدم useUnifiedAuth بدلاً منه:
 *   import { useUnifiedAuth } from '@/contexts/auth-context'
 * 
 * للتوافق مع الكود القديم، يمكنك استيراد useAuth من UserProvider:
 *   import { useAuth } from '@/components/auth/UserProvider'
 * 
 * لكن يُنصح بشدة بالترقية إلى useUnifiedAuth
 */

// إعادة تصدير useUnifiedAuth كـ useAuth للتوافق (مع تحذير)
import { useUnifiedAuth, type User } from '@/contexts/auth-context';
import { useEffect } from 'react';

/**
 * واجهة متوافقة مع useAuth القديم
 */
export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, userData?: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

/**
 * @deprecated استخدم useUnifiedAuth من @/contexts/auth-context بدلاً منه
 * 
 * هذا Hook موجود للتوافق مع الكود القديم فقط
 * سيتم إزالة هذا الملف في الإصدارات القادمة
 */
export function useAuth(): AuthContextType {
  // إعادة توجيه إلى useUnifiedAuth
  const unifiedAuth = useUnifiedAuth();
  
  // تحذير في development mode
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '⚠️ useAuth from @/hooks/use-auth is DEPRECATED.\n' +
        '✅ Please use useUnifiedAuth from @/contexts/auth-context instead.\n' +
        '📖 Migration: Replace useAuth() with useUnifiedAuth()'
      );
    }
  }, []);
  
  // تحويل الواجهة إلى واجهة useAuth القديمة للتوافق
  return {
    user: unifiedAuth.user,
    isLoading: unifiedAuth.isLoading,
    isAuthenticated: unifiedAuth.isAuthenticated,
    login: async (token: string, userData?: User) => {
      await unifiedAuth.login(token, userData || undefined);
    },
    logout: async () => {
      await unifiedAuth.logout();
    },
    updateUser: (userData: Partial<User>) => {
      unifiedAuth.updateUser(userData);
    },
    refreshUser: async () => {
      await unifiedAuth.refreshUser();
    },
  };
}
