/**
 * Canonical frontend role module — single source of truth for `UserRole`.
 *
 * The enum itself lives in `@thanawy/shared/types/enums` (synced with the
 * backend `internal/domain/common/user.go`) and is re-exported here so
 * every frontend module imports the role vocabulary from ONE place instead
 * of hand-maintained string unions that drift silently (previously:
 * `use-permission.ts` and `types/enums.ts` each kept their own copy).
 *
 * Wire rule: role claims arriving over the wire (JWT `role`, `/auth/me`
 * `role`) are UNTRUSTED strings until normalized. Always pass them through
 * `normalizeRole()` before comparing — a lowercase `"admin"` from a
 * differently-cased issuer must gate identically to `"ADMIN"`, and an
 * unknown value must fail closed (`null`) rather than fall through to a
 * default branch.
 *
 * Edge-safe: this module (and `@thanawy/shared/types/enums`) is pure
 * TypeScript with no Node APIs, and `@thanawy/shared` is in
 * `transpilePackages`, so Edge files (`route-guards.ts`, `jwt-edge.ts`,
 * `proxy-pipeline/*`) may import it.
 */

import { UserRole } from "@thanawy/shared/types/enums";

// Re-exported for convenience so call sites write
// `import { UserRole, normalizeRole } from "@/lib/auth/roles"`.
export { UserRole };

/** Every known role, derived from the enum — no hand-kept list to drift. */
export const USER_ROLES: readonly UserRole[] = Object.values(UserRole);

/**
 * Roles with full administrative privilege (UX hint level).
 * Distinct from `ADMIN_PANEL_ROLES` (shell entry, which additionally admits
 * SUPPORT): entering `/admin` is NOT the same as being an admin — every
 * privileged API operation is still authorized by the backend.
 */
export const ADMIN_PRIVILEGE_ROLES: readonly UserRole[] = [
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.MODERATOR,
];

/**
 * Normalizes an untrusted wire value to a canonical `UserRole`.
 * Trims, upper-cases, and validates against the enum. Returns `null` for
 * anything unknown (fail closed) — callers must treat `null` as "no role",
 * never as a default role.
 */
export function normalizeRole(value: unknown): UserRole | null {
  if (typeof value !== "string") return null;
  const canonical = value.trim().toUpperCase();
  if (!canonical) return null;
  return (USER_ROLES as readonly string[]).includes(canonical)
    ? (canonical as UserRole)
    : null;
}

/** Type-guard twin of `normalizeRole` for filter positions. */
export function isKnownRole(value: unknown): value is UserRole {
  return normalizeRole(value) !== null;
}
