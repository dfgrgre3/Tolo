/**
 * The single source of truth for roles allowed into the staff admin panel.
 *
 * Keep this list shared by every client-side admin-panel entry point. The
 * backend remains authoritative for the actual authorization decision.
 *
 * Panel entry ≠ admin privilege
 * -----------------------------
 * `ADMIN_PANEL_ROLES` answers "may this role open the `/admin` shell?"
 * `ADMIN_PRIVILEGE_ROLES` (in `lib/auth/roles.ts`, backing
 * `usePermission().isAdmin()`) answers "does this role hold full admin
 * privilege?" The panel set is intentionally BROADER: SUPPORT staff open
 * the shell to work tickets, but per-screen and per-API authorization stays
 * backend-driven, and `isAdmin()` stays false for them. If the two lists
 * ever need identical membership, that is a product decision — the subset
 * test in `auth-admin-panel-roles.test.ts` pins the current relation
 * (privilege ⊆ panel) so drift fails loudly instead of silently.
 */

import { UserRole, normalizeRole } from "@/lib/auth/roles";

export const ADMIN_PANEL_ROLES: readonly UserRole[] = [
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.MODERATOR,
  UserRole.SUPPORT,
];

export type AdminPanelRole = (typeof ADMIN_PANEL_ROLES)[number];

/**
 * Returns true when the given role may open the staff admin panel shell.
 * The input is normalized (case-tolerant); unknown values fail closed.
 */
export function isStaffAdminPanelRole(role?: string | null): boolean {
  const normalized = normalizeRole(role);
  if (normalized === null) return false;
  return ADMIN_PANEL_ROLES.includes(normalized);
}
