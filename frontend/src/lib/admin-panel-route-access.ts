// Auth module removed – use inline permission constants
export type Permission = string;

type PermissionsMap = {
  USERS_MANAGE: string; USERS_VIEW: string; TEACHERS_VIEW: string; TEACHERS_MANAGE: string;
  LIVE_MONITOR_VIEW: string; ANALYTICS_VIEW: string; REPORTS_VIEW: string;
  SUBJECTS_VIEW: string; SUBJECTS_MANAGE: string; BOOKS_VIEW: string; BOOKS_MANAGE: string;
  EXAMS_VIEW: string; EXAMS_MANAGE: string; RESOURCES_VIEW: string; RESOURCES_MANAGE: string;
  AI_MANAGE: string; CHALLENGES_VIEW: string; CHALLENGES_MANAGE: string;
  ACHIEVEMENTS_VIEW: string; ACHIEVEMENTS_MANAGE: string; REWARDS_VIEW: string; REWARDS_MANAGE: string;
  SEASONS_VIEW: string; SEASONS_MANAGE: string; MARKETING_VIEW: string; MARKETING_MANAGE: string;
  AB_TESTING_VIEW: string; ANNOUNCEMENTS_VIEW: string; ANNOUNCEMENTS_MANAGE: string;
  FORUM_VIEW: string; FORUM_MANAGE: string; BLOG_VIEW: string; BLOG_MANAGE: string;
  EVENTS_VIEW: string; EVENTS_MANAGE: string; CONTESTS_VIEW: string; CONTESTS_MANAGE: string;
  SETTINGS_VIEW: string; AUDIT_LOGS_VIEW: string; ADMIN_BYPASS: string; DASHBOARD_VIEW: string;
};

export const PERMISSIONS: PermissionsMap = {
  USERS_MANAGE: 'users:manage', USERS_VIEW: 'users:view',
  TEACHERS_VIEW: 'teachers:view', TEACHERS_MANAGE: 'teachers:manage',
  LIVE_MONITOR_VIEW: 'live:view', ANALYTICS_VIEW: 'analytics:view',
  REPORTS_VIEW: 'reports:view', SUBJECTS_VIEW: 'subjects:view', SUBJECTS_MANAGE: 'subjects:manage',
  BOOKS_VIEW: 'books:view', BOOKS_MANAGE: 'books:manage',
  EXAMS_VIEW: 'exams:view', EXAMS_MANAGE: 'exams:manage',
  RESOURCES_VIEW: 'resources:view', RESOURCES_MANAGE: 'resources:manage',
  AI_MANAGE: 'ai:manage', CHALLENGES_VIEW: 'challenges:view', CHALLENGES_MANAGE: 'challenges:manage',
  ACHIEVEMENTS_VIEW: 'achievements:view', ACHIEVEMENTS_MANAGE: 'achievements:manage',
  REWARDS_VIEW: 'rewards:view', REWARDS_MANAGE: 'rewards:manage',
  SEASONS_VIEW: 'seasons:view', SEASONS_MANAGE: 'seasons:manage',
  MARKETING_VIEW: 'marketing:view', MARKETING_MANAGE: 'marketing:manage',
  AB_TESTING_VIEW: 'ab_testing:view', ANNOUNCEMENTS_VIEW: 'announcements:view',
  ANNOUNCEMENTS_MANAGE: 'announcements:manage', FORUM_VIEW: 'forum:view', FORUM_MANAGE: 'forum:manage',
  BLOG_VIEW: 'blog:view', BLOG_MANAGE: 'blog:manage',
  EVENTS_VIEW: 'events:view', EVENTS_MANAGE: 'events:manage',
  CONTESTS_VIEW: 'contests:view', CONTESTS_MANAGE: 'contests:manage',
  SETTINGS_VIEW: 'settings:view', AUDIT_LOGS_VIEW: 'audit_logs:view',
  ADMIN_BYPASS: '*:*', DASHBOARD_VIEW: 'dashboard:view',
};

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
