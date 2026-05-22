import { PERMISSIONS, type Permission } from "@/lib/permissions";

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
