/**
 * Admin panel role helpers.
 *
 * The Go backend is authoritative for permissions (GET /api/auth/me), but we need
 * a small client-side guard to decide whether a role may access the /admin-login
 * flow and the admin shell.
 */

export const ADMIN_PANEL_ROLES = [
  "ADMIN",
  "SUPER_ADMIN",
  "MODERATOR",
  "SUPPORT",
] as const;

export type AdminPanelRole = (typeof ADMIN_PANEL_ROLES)[number];

/**
 * Returns true when the given role is allowed to use the staff admin panel.
 */
export function isStaffAdminPanelRole(role?: string | null): boolean {
  if (!role) return false;
  return (ADMIN_PANEL_ROLES as readonly string[]).includes(role);
}