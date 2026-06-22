import { useAuthStore, type UserRole, hasPermission } from '@/lib/auth';

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
   * Delegates to hasPermission() from lib/permissions.ts which uses
   * permissionGrantMatches() for wildcard support (e.g. "*:manage").
   * SUPER_ADMIN and ADMIN bypass all permission checks (via permissions.ts).
   */
  const can = (permission: string): boolean => {
    if (!isAuthenticated || !user) return false;
    return hasPermission(user, permission);
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
   * Uses hasPermission() which respects wildcard grants and SUPER_ADMIN bypass.
   */
  const hasAllPermissions = (...permissions: string[]): boolean => {
    if (!isAuthenticated || !user) return false;
    return permissions.every((p) => hasPermission(user, p));
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
