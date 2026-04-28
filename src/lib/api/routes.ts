export const apiRoutes = {
  health: {
    healthz: "/api/healthz",
    readyz: "/api/readyz",
  },
  auth: {
    login: "/api/auth/login",
    register: "/api/auth/register",
    logout: "/api/auth/logout",
    me: "/api/auth/me",
    refresh: "/api/auth/refresh",
    sessions: "/api/auth/sessions",
    verify2FA: "/api/auth/2fa/verify",
  },
  admin: {
    dashboard: "/api/admin/dashboard",
    live: "/api/admin/live",
    analytics: "/api/admin/analytics",
    infrastructureStats: "/api/admin/infrastructure/stats",
    announcements: "/api/admin/announcements",
    reportsOverview: "/api/admin/reports/overview",
    reportsUsers: "/api/admin/reports/users",
    reportsBooks: "/api/admin/reports/books",
    users: "/api/admin/users",
    teachers: "/api/admin/teachers",
    subjects: "/api/admin/subjects",
    courses: "/api/admin/courses",
    exams: "/api/admin/exams",
    courseCategories: "/api/admin/course-categories",
  },
  settings: {
    preferences: "/api/settings/preferences",
  },
  progress: {
    summary: "/api/progress/summary",
  },
  analytics: {
    weekly: "/api/analytics/weekly",
    predictions: "/api/analytics/predictions",
    performance: "/api/analytics/performance",
  },
  notifications: {
    list: "/api/notifications",
    unreadCount: "/api/notifications/unread-count",
    markRead: "/api/notifications/mark-read",
  },
  activities: {
    recent: "/api/activities/recent",
    readAll: "/api/activities/read-all",
    read: (id: string) => `/api/activities/${id}/read`,
  },
  billing: {
    wallet: "/api/billing/wallet",
  },
  subscriptions: {
    plans: "/api/subscriptions/plans",
    checkout: "/api/subscriptions/checkout",
  },
  coupons: {
    validate: "/api/coupons/validate",
  },
  users: {
    guest: "/api/users/guest",
  },
  library: {
    books: "/api/library/books",
    categories: "/api/library/categories",
  },
  gamification: {
    progress: "/api/gamification/progress",
    achievements: "/api/gamification/achievements",
    leaderboard: "/api/gamification/leaderboard",
    goals: "/api/gamification/goals",
  },
} as const;

type ApiRoutes = typeof apiRoutes;
