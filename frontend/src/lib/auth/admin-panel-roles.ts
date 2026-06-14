/** Matches Go `AdminOrModerator`: `ADMIN`, `SUPER_ADMIN` and `MODERATOR` may call `/api/admin/*`; further checks use `PermissionRequired`. */
export function isStaffAdminPanelRole(role: string | undefined): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN" || role === "MODERATOR";
}
