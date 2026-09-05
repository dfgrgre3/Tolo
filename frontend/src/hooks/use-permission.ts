"use client";

import { useAuth } from "@/hooks/use-auth";

// Mirrors the backend's real UserRole constants (internal/domain/common/user.go).
// No PREMIUM — that was never a backend role; premium status is a subscription
// property (see UserMenu.tsx's isPremiumUser).
export type UserRole = "ADMIN" | "SUPER_ADMIN" | "TEACHER" | "MODERATOR" | "STUDENT" | "PARENT" | "SUPPORT";

function permissionGrantMatches(grant: string, required: string): boolean {
  if (grant === required || grant === "admin:bypass") return true;
  if (grant === "*:manage") return required.endsWith(":manage");
  if (grant === "*") return true;
  if (grant.length > 2 && grant.endsWith(":*")) {
    const mod = grant.slice(0, -2);
    return required.startsWith(mod + ":");
  }
  return false;
}

function hasPermission(
  user: { role: string; permissions: string[] } | null,
  perm: string
): boolean {
  if (!user) return false;
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") return true;
  return user.permissions.some((grant) => permissionGrantMatches(grant, perm));
}

/**
 * usePermission — Centralised role & permission checks
 *
 * Usage:
 *   const { can, is, hasAnyRole } = usePermission();
 *   if (can('delete:course')) { ... }
 *   if (is('ADMIN')) { ... }
 */
export function usePermission() {
  const { user, isAuthenticated } = useAuth();

  const can = (permission: string): boolean => {
    if (!isAuthenticated || !user) return false;
    return hasPermission(user, permission);
  };

  const is = (role: UserRole): boolean => {
    if (!isAuthenticated || !user) return false;
    return user.role === role;
  };

  const hasAnyRole = (...roles: UserRole[]): boolean => {
    if (!isAuthenticated || !user) return false;
    return roles.includes(user.role as UserRole);
  };

  const hasAllPermissions = (...permissions: string[]): boolean => {
    if (!isAuthenticated || !user) return false;
    return permissions.every((p) => hasPermission(user, p));
  };

  const isAdmin = (): boolean => {
    return hasAnyRole("ADMIN", "SUPER_ADMIN", "MODERATOR");
  };

  const isContentCreator = (): boolean => {
    return hasAnyRole("TEACHER", "ADMIN", "SUPER_ADMIN");
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
