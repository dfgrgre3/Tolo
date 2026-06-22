import { UserRole } from './roles';
import { Permission, resolvePermissionInput, permissionGrantMatches, getEffectivePermissionStrings } from './permissions';

/**
 * Checks if a user has a specific role or one of multiple roles.
 */
export function hasRole(
  user: { role: string } | null | undefined,
  role: UserRole | UserRole[]
): boolean {
  if (!user?.role) return false;
  const roles = Array.isArray(role) ? role : [role];
  return roles.includes(user.role.toUpperCase() as UserRole);
}

/**
 * Checks if a user has a specific permission, accounting for wildcard matches
 * and administrative bypass for ADMIN and SUPER_ADMIN.
 */
export function hasPermission(
  user: { role: string; permissions?: string[] | null } | null | undefined,
  permission: Permission | string
): boolean {
  if (!user) return false;

  const role = user.role?.toUpperCase();
  // SUPER_ADMIN and ADMIN both hold admin:bypass — grant all permissions.
  if (role === "ADMIN" || role === "SUPER_ADMIN") return true;

  const required = resolvePermissionInput(permission);
  if (!required) return false;

  for (const grant of getEffectivePermissionStrings(user)) {
    if (permissionGrantMatches(grant, required)) return true;
  }
  return false;
}

/**
 * Evaluates access conditions based on required permission and/or roles.
 */
export function canAccess(
  user: { role: string; permissions?: string[] | null } | null | undefined,
  requiredPermission?: Permission | string,
  requiredRoles?: UserRole | UserRole[]
): boolean {
  if (!user) return false;

  if (requiredRoles) {
    if (!hasRole(user, requiredRoles)) return false;
  }

  if (requiredPermission) {
    if (!hasPermission(user, requiredPermission)) return false;
  }

  return true;
}

