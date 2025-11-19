/**
 * Compatibility Layer
 * طبقة التوافق للاستخدام التدريجي
 * 
 * يوفر واجهة موحدة للانتقال التدريجي من النظام القديم إلى الجديد
 */

import { getAuthManager } from './unified-auth-manager';
import type { User } from '@/components/auth/UnifiedAuthProvider';

/**
 * Compatibility Hook
 * يوفر واجهة متوافقة مع useAuth القديم
 * 
 * @deprecated استخدم useUnifiedAuth بدلاً منه
 */
export function useAuthCompatibility() {
  const authManager = getAuthManager();
  const state = authManager.getState();

  return {
    user: state.user as User | null,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    login: async (token: string, userData?: User) => {
      await authManager.login(token, userData);
    },
    logout: async () => {
      await authManager.logout();
    },
    updateUser: (userData: Partial<User>) => {
      authManager.updateUser(userData);
    },
    refreshUser: async () => {
      await authManager.syncWithServer();
    },
  };
}

/**
 * Check if unified auth is available
 */
export function isUnifiedAuthAvailable(): boolean {
  try {
    const authManager = getAuthManager();
    return authManager !== null;
  } catch {
    return false;
  }
}

/**
 * Get auth state (compatible with old system)
 */
export function getAuthState() {
  const authManager = getAuthManager();
  return authManager.getState();
}

/**
 * Migration helper
 * يساعد في الانتقال التدريجي
 */
export const MigrationHelper = {
  /**
   * Check if component is using old auth system
   */
  isUsingOldAuth(componentName: string): boolean {
    // يمكن إضافة منطق للتحقق
    return false;
  },

  /**
   * Get migration recommendations
   */
  getRecommendations(): string[] {
    return [
      'استبدل useAuth بـ useUnifiedAuth',
      'استبدل AuthProvider بـ UnifiedAuthProvider',
      'استخدم withEnhancedAuth في API routes',
    ];
  },
};

