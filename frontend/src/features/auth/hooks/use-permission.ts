"use client";

import { useAuth } from "@/hooks/use-auth";
import {
  UserRole,
  normalizeRole,
  ADMIN_PRIVILEGE_ROLES,
} from "@/lib/auth/roles";

// Re-exported so existing `import type { UserRole } from
// "@/features/auth/hooks/use-permission"` call sites keep working (the legacy
// `@/hooks/use-permission` facade was removed in B-11); the canonical
// definition lives in `@/lib/auth/roles` (shared enum, backend-synced).
export type { UserRole } from "@/lib/auth/roles";

/**
 * Backend permission-grant vocabulary (server-issued strings in
 * `user.permissions`). Documented here because the matching semantics are
 * narrower than they look:
 *   - `"admin:bypass"` — backend-issued wildcard grant. Matched literally;
 *     the frontend never mints it, only honors what the backend sent.
 *   - `"*:manage"` — covers ONLY required permissions ending in `:manage`.
 *     It does NOT cover `:read` / `:write` / `:delete`. Request explicit
 *     grants for those; do not assume manage-implies-read.
 *   - `"*"` — full wildcard (backend-issued only).
 *   - `"prefix:*"` — covers `prefix:anything`.
 */
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
  // Fail closed on unrecognized roles: grants are only honored for a known
  // role, so a garbage role string can never ride on stale permissions.
  const role = normalizeRole(user.role);
  if (role === null) return false;
  if (role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN) return true;
  return user.permissions.some((grant) => permissionGrantMatches(grant, perm));
}

/**
 * usePermission — client-side UX hints only.
 *
 * This hook must never be treated as an authorization boundary. Its values
 * come from client auth state and can be stale or modified by the caller.
 * Every privileged API operation must still be authorized by the backend
 * using the authenticated JWT/session, server-side permissions, and resource
 * ownership where applicable.
 *
 * `isAdmin()` reports full admin privilege (ADMIN / SUPER_ADMIN /
 * MODERATOR). It is intentionally NARROWER than panel entry
 * (`isStaffAdminPanelRole`, which additionally admits SUPPORT): opening the
 * `/admin` shell is not the same as holding admin privilege.
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
    return normalizeRole(user.role) === role;
  };

  const hasAnyRole = (...roles: UserRole[]): boolean => {
    if (!isAuthenticated || !user) return false;
    const normalized = normalizeRole(user.role);
    return normalized !== null && roles.includes(normalized);
  };

  const hasAllPermissions = (...permissions: string[]): boolean => {
    if (!isAuthenticated || !user) return false;
    return permissions.every((p) => hasPermission(user, p));
  };

  const isAdmin = (): boolean => {
    if (!isAuthenticated || !user) return false;
    const normalized = normalizeRole(user.role);
    return normalized !== null && ADMIN_PRIVILEGE_ROLES.includes(normalized);
  };

  const isContentCreator = (): boolean => {
    return hasAnyRole(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPER_ADMIN);
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
