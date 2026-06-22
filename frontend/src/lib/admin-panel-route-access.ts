import { PERMISSIONS, type Permission } from "@/lib/auth";

/**
 * First matching rule wins. Order: most specific routes before generic `/admin`.
 * Unmatched `/admin/*` requires full bypass (`*:*`) — same bar as sensitive Go routes without a dedicated rule.
 */
const ADMIN_PATH_RULES: { pattern: RegExp; permission: Permission }[] = [
  { pattern: /^\/admin\/users\/permissions/, permission: PERMISSIONS.USERS_MANAGE },
  { pattern: /^\/admin\/users\/(?:new|create)$/, permission: PERMISSIONS.USERS_MANAGE },
  { pattern: /^\/admin\/users\/[^/]+\/(?:edit|permissions)$/, permission: PERMISSIONS.USERS_MANAGE },
  { pattern: /^\/admin\/users\/[^/]+$/, permission: PERMISSIONS.USERS_VIEW },
  { pattern: /^\/admin\/users\/?$/, permission: PERMISSIONS.USERS_VIEW },
  { pattern: /^\/admin\/teachers/, permission: PERMISSIONS.TEACHERS_VIEW },
  { pattern: /^\/admin\/live/, permission: PERMISSIONS.LIVE_MONITOR_VIEW },
  { pattern: /^\/admin\/analytics/, permission: PERMISSIONS.ANALYTICS_VIEW },
  { pattern: /^\/admin\/revenue/, permission: PERMISSIONS.ANALYTICS_VIEW },
  { pattern: /^\/admin\/payments/, permission: PERMISSIONS.ANALYTICS_VIEW },
  { pattern: /^\/admin\/reports/, permission: PERMISSIONS.REPORTS_VIEW },
  { pattern: /^\/admin\/course-categories/, permission: PERMISSIONS.SUBJECTS_VIEW },
  { pattern: /^\/admin\/courses/, permission: PERMISSIONS.SUBJECTS_VIEW },
  { pattern: /^\/admin\/subjects/, permission: PERMISSIONS.SUBJECTS_VIEW },
  { pattern: /^\/admin\/books/, permission: PERMISSIONS.BOOKS_VIEW },
  { pattern: /^\/admin\/exams/, permission: PERMISSIONS.EXAMS_VIEW },
  { pattern: /^\/admin\/resources/, permission: PERMISSIONS.RESOURCES_VIEW },
  { pattern: /^\/admin\/ai/, permission: PERMISSIONS.AI_MANAGE },
  { pattern: /^\/admin\/challenges/, permission: PERMISSIONS.CHALLENGES_VIEW },
  { pattern: /^\/admin\/achievements/, permission: PERMISSIONS.ACHIEVEMENTS_VIEW },
  { pattern: /^\/admin\/rewards/, permission: PERMISSIONS.REWARDS_VIEW },
  { pattern: /^\/admin\/seasons/, permission: PERMISSIONS.SEASONS_VIEW },
  { pattern: /^\/admin\/marketing/, permission: PERMISSIONS.MARKETING_VIEW },
  { pattern: /^\/admin\/ab-testing/, permission: PERMISSIONS.AB_TESTING_VIEW },
  { pattern: /^\/admin\/coupons/, permission: PERMISSIONS.MARKETING_VIEW },
  { pattern: /^\/admin\/notifications/, permission: PERMISSIONS.ANNOUNCEMENTS_MANAGE },
  { pattern: /^\/admin\/announcements/, permission: PERMISSIONS.ANNOUNCEMENTS_VIEW },
  { pattern: /^\/admin\/forum/, permission: PERMISSIONS.FORUM_VIEW },
  { pattern: /^\/admin\/blog/, permission: PERMISSIONS.BLOG_VIEW },
  { pattern: /^\/admin\/events/, permission: PERMISSIONS.EVENTS_VIEW },
  { pattern: /^\/admin\/contests/, permission: PERMISSIONS.CONTESTS_VIEW },
  { pattern: /^\/admin\/infrastructure/, permission: PERMISSIONS.SETTINGS_VIEW },
  { pattern: /^\/admin\/backups/, permission: PERMISSIONS.SETTINGS_VIEW },
  { pattern: /^\/admin\/settings/, permission: PERMISSIONS.SETTINGS_VIEW },
  { pattern: /^\/admin\/tickets/, permission: PERMISSIONS.USERS_MANAGE },
  { pattern: /^\/admin\/audit-logs/, permission: PERMISSIONS.AUDIT_LOGS_VIEW },
  { pattern: /^\/admin\/automations/, permission: PERMISSIONS.ADMIN_BYPASS },
  { pattern: /^\/admin\/?$/, permission: PERMISSIONS.DASHBOARD_VIEW },
];

export function getRequiredPermissionForAdminPath(pathname: string): Permission | null {
  if (!pathname.startsWith("/admin")) return null;
  for (const { pattern, permission } of ADMIN_PATH_RULES) {
    if (pattern.test(pathname)) return permission;
  }
  return PERMISSIONS.ADMIN_BYPASS;
}

const ADMIN_API_RULES: {
  pattern: RegExp;
  view: Permission;
  manage?: Permission;
}[] = [
  { pattern: /^\/api\/admin\/users\/bulk-send-message/, view: PERMISSIONS.USERS_MANAGE },
  { pattern: /^\/api\/admin\/users/, view: PERMISSIONS.USERS_VIEW, manage: PERMISSIONS.USERS_MANAGE },
  { pattern: /^\/api\/admin\/teachers/, view: PERMISSIONS.TEACHERS_VIEW, manage: PERMISSIONS.TEACHERS_MANAGE },
  { pattern: /^\/api\/admin\/live/, view: PERMISSIONS.LIVE_MONITOR_VIEW },
  { pattern: /^\/api\/admin\/analytics/, view: PERMISSIONS.ANALYTICS_VIEW },
  { pattern: /^\/api\/admin\/reports/, view: PERMISSIONS.REPORTS_VIEW },
  { pattern: /^\/api\/admin\/course-categories/, view: PERMISSIONS.SUBJECTS_VIEW, manage: PERMISSIONS.SUBJECTS_MANAGE },
  { pattern: /^\/api\/admin\/courses/, view: PERMISSIONS.SUBJECTS_VIEW, manage: PERMISSIONS.SUBJECTS_MANAGE },
  { pattern: /^\/api\/admin\/subjects/, view: PERMISSIONS.SUBJECTS_VIEW, manage: PERMISSIONS.SUBJECTS_MANAGE },
  { pattern: /^\/api\/admin\/books/, view: PERMISSIONS.BOOKS_VIEW, manage: PERMISSIONS.BOOKS_MANAGE },
  { pattern: /^\/api\/admin\/exams/, view: PERMISSIONS.EXAMS_VIEW, manage: PERMISSIONS.EXAMS_MANAGE },
  { pattern: /^\/api\/admin\/resources/, view: PERMISSIONS.RESOURCES_VIEW, manage: PERMISSIONS.RESOURCES_MANAGE },
  { pattern: /^\/api\/admin\/ai/, view: PERMISSIONS.AI_MANAGE },
  { pattern: /^\/api\/admin\/challenges/, view: PERMISSIONS.CHALLENGES_VIEW, manage: PERMISSIONS.CHALLENGES_MANAGE },
  { pattern: /^\/api\/admin\/achievements/, view: PERMISSIONS.ACHIEVEMENTS_VIEW, manage: PERMISSIONS.ACHIEVEMENTS_MANAGE },
  { pattern: /^\/api\/admin\/rewards/, view: PERMISSIONS.REWARDS_VIEW, manage: PERMISSIONS.REWARDS_MANAGE },
  { pattern: /^\/api\/admin\/seasons/, view: PERMISSIONS.SEASONS_VIEW, manage: PERMISSIONS.SEASONS_MANAGE },
  { pattern: /^\/api\/admin\/marketing/, view: PERMISSIONS.MARKETING_VIEW, manage: PERMISSIONS.MARKETING_MANAGE },
  { pattern: /^\/api\/admin\/ab-testing/, view: PERMISSIONS.AB_TESTING_VIEW },
  { pattern: /^\/api\/admin\/coupons/, view: PERMISSIONS.MARKETING_VIEW, manage: PERMISSIONS.MARKETING_MANAGE },
  { pattern: /^\/api\/admin\/notifications/, view: PERMISSIONS.ANNOUNCEMENTS_MANAGE },
  { pattern: /^\/api\/admin\/announcements/, view: PERMISSIONS.ANNOUNCEMENTS_VIEW, manage: PERMISSIONS.ANNOUNCEMENTS_MANAGE },
  { pattern: /^\/api\/admin\/forum/, view: PERMISSIONS.FORUM_VIEW, manage: PERMISSIONS.FORUM_MANAGE },
  { pattern: /^\/api\/admin\/blog/, view: PERMISSIONS.BLOG_VIEW, manage: PERMISSIONS.BLOG_MANAGE },
  { pattern: /^\/api\/admin\/events/, view: PERMISSIONS.EVENTS_VIEW, manage: PERMISSIONS.EVENTS_MANAGE },
  { pattern: /^\/api\/admin\/contests/, view: PERMISSIONS.CONTESTS_VIEW, manage: PERMISSIONS.CONTESTS_MANAGE },
  { pattern: /^\/api\/admin\/(?:infrastructure|backups|settings|security)/, view: PERMISSIONS.SETTINGS_VIEW },
  { pattern: /^\/api\/admin\/tickets/, view: PERMISSIONS.USERS_MANAGE },
  { pattern: /^\/api\/admin\/audit-logs/, view: PERMISSIONS.AUDIT_LOGS_VIEW },
  { pattern: /^\/api\/admin\/automations/, view: PERMISSIONS.ADMIN_BYPASS },
  { pattern: /^\/api\/admin\/dashboard/, view: PERMISSIONS.DASHBOARD_VIEW },
];

function isWriteMethod(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

export function getRequiredPermissionForAdminApiRequest(
  pathname: string,
  method: string,
): Permission | null {
  if (!pathname.startsWith("/api/admin")) return null;

  for (const rule of ADMIN_API_RULES) {
    if (rule.pattern.test(pathname)) {
      return isWriteMethod(method) ? rule.manage || rule.view : rule.view;
    }
  }

  return PERMISSIONS.ADMIN_BYPASS;
}
