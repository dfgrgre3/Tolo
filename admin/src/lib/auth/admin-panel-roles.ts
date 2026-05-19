/** Matches Go `AdminRequired`: `ADMIN` and `MODERATOR` may call `/api/admin/*`; further checks use `PermissionRequired`. */
export function isStaffAdminPanelRole(role: string | undefined): boolean {
  return role === "ADMIN" || role === "MODERATOR";
}
