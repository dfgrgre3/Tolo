import { UserRole } from "@prisma/client";

export const PERMISSIONS = {
  // Global / Dashboard
  DASHBOARD_VIEW: "dashboard:view",
  ANALYTICS_VIEW: "analytics:view",
  REPORTS_VIEW: "reports:view", // Moderator can view reports
  
  // User Management
  USERS_VIEW: "users:view",
  USERS_MANAGE: "users:manage", // Super Admin only
  STUDENTS_VIEW: "students:view", // Teacher can view their students
  
  // Content Management (Subjects, Books, Resources, Exams)
  SUBJECTS_VIEW: "subjects:view",
  SUBJECTS_MANAGE: "subjects:manage", // Super Admin
  OWN_SUBJECTS_MANAGE: "own_subjects:manage", // Teacher manages own
  
  BOOKS_VIEW: "books:view",
  BOOKS_MANAGE: "books:manage", // Super Admin
  OWN_BOOKS_MANAGE: "own_books:manage", // Teacher manages own
  
  RESOURCES_VIEW: "resources:view",
  RESOURCES_MANAGE: "resources:manage",
  OWN_RESOURCES_MANAGE: "own_resources:manage",
  
  EXAMS_VIEW: "exams:view",
  EXAMS_MANAGE: "exams:manage",
  OWN_EXAMS_MANAGE: "own_exams:manage",
  
  // Educational Settings
  TEACHERS_VIEW: "teachers:view",
  TEACHERS_MANAGE: "teachers:manage",
  
  SEASONS_VIEW: "seasons:view",
  SEASONS_MANAGE: "seasons:manage",
  
  CHALLENGES_VIEW: "challenges:view",
  CHALLENGES_MANAGE: "challenges:manage",
  OWN_CHALLENGES_MANAGE: "own_challenges:manage",
  
  CONTESTS_VIEW: "contests:view",
  CONTESTS_MANAGE: "contests:manage",
  
  // Community, Forum, Blog
  BLOG_VIEW: "blog:view",
  BLOG_MANAGE: "blog:manage", // Admin
  
  FORUM_VIEW: "forum:view",
  FORUM_MODERATE: "forum:moderate", // Moderator (hide/delete)
  FORUM_MANAGE: "forum:manage", // Admin
  
  COMMENTS_VIEW: "comments:view",
  COMMENTS_MODERATE: "comments:moderate",
  
  EVENTS_VIEW: "events:view",
  EVENTS_MANAGE: "events:manage",
  
  ANNOUNCEMENTS_VIEW: "announcements:view",
  ANNOUNCEMENTS_MANAGE: "announcements:manage",
  
  // Gamification
  ACHIEVEMENTS_VIEW: "achievements:view",
  ACHIEVEMENTS_MANAGE: "achievements:manage",
  REWARDS_VIEW: "rewards:view",
  REWARDS_MANAGE: "rewards:manage",
  
  // AI Tools
  AI_MANAGE: "ai:manage",

  // Live Operations
  LIVE_MONITOR_VIEW: "live_monitor:view",

  // Marketing & Growth
  MARKETING_VIEW: "marketing:view",
  AB_TESTING_VIEW: "ab_testing:view",
  
  // System overrides
  SETTINGS_VIEW: "settings:view",
  SETTINGS_MANAGE: "settings:manage",
  AUDIT_LOGS_VIEW: "audit_logs:view", // Moderator can view actions
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // قائد أعلى: كل الصلاحيات
  ADMIN: Object.values(PERMISSIONS) as Permission[],
  
  // مراقب: صلاحية قراءة التقارير ومراقبة المنشورات والتعليقات دون القدرة على التعديل الجذري
  MODERATOR: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.STUDENTS_VIEW,
    PERMISSIONS.TEACHERS_VIEW,
    PERMISSIONS.SUBJECTS_VIEW,
    PERMISSIONS.EXAMS_VIEW,
    PERMISSIONS.BLOG_VIEW,
    PERMISSIONS.FORUM_VIEW,
    PERMISSIONS.FORUM_MODERATE,
    PERMISSIONS.COMMENTS_VIEW,
    PERMISSIONS.COMMENTS_MODERATE,
    PERMISSIONS.EVENTS_VIEW,
    PERMISSIONS.ANNOUNCEMENTS_VIEW,
    PERMISSIONS.AUDIT_LOGS_VIEW,
    PERMISSIONS.LIVE_MONITOR_VIEW,
    PERMISSIONS.MARKETING_VIEW,
  ],
  
  // قائد كتيبة: يرى فقط محاربيه والدروس الموكلة إليه
  TEACHER: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.STUDENTS_VIEW,         // يرى محاربيه
    PERMISSIONS.SUBJECTS_VIEW,
    PERMISSIONS.OWN_SUBJECTS_MANAGE,   // يدير دروسه فقط
    PERMISSIONS.BOOKS_VIEW,
    PERMISSIONS.OWN_BOOKS_MANAGE,
    PERMISSIONS.RESOURCES_VIEW,
    PERMISSIONS.OWN_RESOURCES_MANAGE,
    PERMISSIONS.EXAMS_VIEW,
    PERMISSIONS.OWN_EXAMS_MANAGE,      // اختباراته فقط
    PERMISSIONS.CHALLENGES_VIEW,
    PERMISSIONS.OWN_CHALLENGES_MANAGE,
    PERMISSIONS.ANALYTICS_VIEW,
  ],
  
  STUDENT: [
    PERMISSIONS.DASHBOARD_VIEW,
  ],
  
  USER: [
    PERMISSIONS.DASHBOARD_VIEW,
  ],
};

/**
 * Checks if a user has a specific permission.
 * A user has a permission if:
 * 1. Their role's default permissions include it.
 * 2. It is explicitly listed in their `permissions` array (override).
 */
export function hasPermission(
  user: { role: UserRole; permissions?: string[] } | null,
  permission: Permission
): boolean {
  if (!user) return false;

  // Admin has all permissions (Super Admin override)
  if (user.role === "ADMIN") return true;

  // Check default role permissions
  const defaultPermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || [];
  if (defaultPermissions.includes(permission)) return true;

  // Check explicit overrides configuration per user
  if (user.permissions?.includes(permission)) return true;

  return false;
}
