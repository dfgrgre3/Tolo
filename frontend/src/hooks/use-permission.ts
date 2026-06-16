import { useAuthStore } from '@/lib/auth/auth-store';

// ── Types ────────────────────────────────────────────────────────────────────

export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN' | 'SUPER_ADMIN' | 'MODERATOR' | 'PREMIUM';

/**
 * usePermission — Centralised role & permission checks
 *
 * Usage:
 *   const { can, is, hasAnyRole } = usePermission();
 *   if (can('delete:course')) { ... }
 *   if (is('ADMIN')) { ... }
 */
export function usePermission() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  /**
   * Check whether the current user has a specific permission string.
   * Permissions are stored in `user.permissions` (array of strings).
   */
  const can = (permission: string): boolean => {
    if (!isAuthenticated || !user) return false;
    // SUPER_ADMIN and ADMIN bypass all permission checks
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return true;
    return user.permissions.includes(permission);
  };

  /**
   * Check whether the current user has an exact role.
   */
  const is = (role: UserRole): boolean => {
    if (!isAuthenticated || !user) return false;
    return user.role === role;
  };

  /**
   * Check whether the current user has ANY of the given roles.
   */
  const hasAnyRole = (...roles: UserRole[]): boolean => {
    if (!isAuthenticated || !user) return false;
    return roles.includes(user.role);
  };

  /**
   * Check whether the current user has ALL of the given permissions.
   */
  const hasAllPermissions = (...permissions: string[]): boolean => {
    if (!isAuthenticated || !user) return false;
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return true;
    return permissions.every((p) => user.permissions.includes(p));
  };

  /**
   * Returns true if the user is an admin-tier role.
   */
  const isAdmin = (): boolean => {
    return hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MODERATOR');
  };

  /**
   * Returns true if the user is a content creator (teacher or admin).
   */
  const isContentCreator = (): boolean => {
    return hasAnyRole('TEACHER', 'ADMIN', 'SUPER_ADMIN');
  };

  return {
    can,
    is,
    hasAnyRole,
    hasAllPermissions,
    isAdmin,
    isContentCreator,
    user,
    isAuthenticated,
  };
}
