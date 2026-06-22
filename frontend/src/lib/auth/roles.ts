/**
 * All valid user roles — must be kept in sync with Go backend models.UserRole
 * This is the SINGLE SOURCE OF TRUTH for role definitions in the frontend.
 * DO NOT redefine UserRole elsewhere — import from '@/lib/auth/roles'.
 */
export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MODERATOR'
  | 'TEACHER'
  | 'PREMIUM'
  | 'STUDENT';

/**
 * Set of all valid roles for runtime validation.
 * Used in resolveClerkRole() to reject unknown/injected role strings.
 */
export const VALID_ROLES = new Set<string>([
  'SUPER_ADMIN',
  'ADMIN',
  'MODERATOR',
  'TEACHER',
  'PREMIUM',
  'STUDENT',
]);

/**
 * Role hierarchy weights — higher number = higher privilege.
 * Matches backend auth.go roleHierarchy map exactly.
 * Use for privilege-escalation checks (e.g. impersonation).
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  STUDENT:     1,
  PREMIUM:     2,
  TEACHER:     3,
  MODERATOR:   4,
  ADMIN:       5,
  SUPER_ADMIN: 6,
};

/**
 * Type-safe Clerk session claims structure.
 * Clerk stores the backend role in publicMetadata, surfaced as sessionClaims.metadata.role
 */
export interface ClerkSessionClaims {
  /** Public metadata set by the backend via UpdateUserMetadataInClerk() */
  metadata?: {
    role?: UserRole | string;
    permissions?: string[];
  };
  /** Legacy flat role field — fallback only */
  role?: UserRole | string;
  /** Standard JWT fields */
  sub?: string;
  iat?: number;
  exp?: number;
}

/**
 * Resolves the user role from Clerk session claims.
 * Checks `metadata.role` first (backend-managed), falls back to `role` (legacy).
 *
 * SECURITY: Validates the resolved role against VALID_ROLES before returning.
 * This prevents unknown/injected role strings from being treated as valid roles.
 * Returns null if no valid role is present — callers must handle the null case explicitly.
 */
export function resolveClerkRole(
  claims: ClerkSessionClaims | null | undefined
): UserRole | null {
  if (!claims) return null;
  const raw = claims.metadata?.role ?? claims.role ?? null;
  if (!raw) return null;
  const normalized = raw.toUpperCase();
  // SECURITY: reject any role string not in the known-good set
  if (!VALID_ROLES.has(normalized)) {
    console.warn('[Auth] resolveClerkRole: unknown role rejected:', raw);
    return null;
  }
  return normalized as UserRole;
}

/** Admin-level roles that may access /admin/* routes */
export const ADMIN_ROLES: ReadonlySet<UserRole> = new Set([
  'SUPER_ADMIN',
  'ADMIN',
  'MODERATOR',
]);

/** Checks if a role can access the admin panel */
export function isAdminRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return ADMIN_ROLES.has(role.toUpperCase() as UserRole);
}

/** Checks if a role is a staff admin panel role */
export function isStaffAdminPanelRole(role: string | undefined): boolean {
  if (!role) return false;
  const upper = role.toUpperCase();
  return upper === "ADMIN" || upper === "SUPER_ADMIN" || upper === "MODERATOR";
}
