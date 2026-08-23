/**
 * Centralized API route definitions.
 * Every route used across the app should be referenced from here.
 * Synced with backend router: internal/router/
 * Last sync: 2026-06-29
 */
export const apiRoutes = {
  // ──────────────────────────────────────────
  // Health
  // ──────────────────────────────────────────
  health: {
    healthz: '/api/healthz',
    readyz: '/api/readyz',
    live: '/health/live',
    ready: '/health/ready',
  },

  // ──────────────────────────────────────────
  // Authentication  (public_routes.go)
  // ──────────────────────────────────────────
  auth: {
    login: '/api/auth/login',
    adminLogin: '/api/auth/admin-login',
    register: '/api/auth/register',
    logout: '/api/auth/logout',
    me: '/api/auth/me',
    refresh: '/api/auth/refresh',
    refreshSession: '/api/auth/refresh-session',
    sessions: '/api/auth/sessions',
    revokeSession: (id: string) => `/api/auth/sessions/${id}`,
    profile: '/api/auth/profile',
    deleteAccount: '/api/auth/account',
    validateToken: '/api/auth/validate-token',
    forgotPassword: '/api/auth/forgot-password',
    resetPassword: '/api/auth/reset-password',
    changePassword: '/api/auth/change-password',
    verifyEmail: '/api/auth/verify-email',
    resendVerification: '/api/auth/resend-verification',
    recovery: {
      initiate: '/api/auth/recovery/initiate',
      finalize: '/api/auth/recovery/finalize',
    },
    mfa: {
      setup: '/api/auth/mfa/setup',
      enable: '/api/auth/mfa/enable',
      disable: '/api/auth/mfa/disable',
      // The single MFA challenge endpoint. A second alias ('/api/auth/2fa/verify')
      // used to live here and was never called; having two spellings for one
      // operation is how the login/MFA contract drifted apart in the first place.
      verify: '/api/auth/mfa/verify',
    },
    social: {
      login: (provider: string) => `/api/auth/social/${provider}`,
      callback: (provider: string) => `/api/auth/callback/${provider}`,
      link: '/api/auth/social/link',
      unlink: '/api/auth/social/unlink',
      accounts: '/api/auth/social/accounts',
    },
    magicLink: {
      request: '/api/auth/magic-link/request',
      verify: '/api/auth/magic-link/verify',
    },
  },

  // ──────────────────────────────────────────
  // Courses / Subjects  (public_routes.go + protected_routes.go)
  // ──────────────────────────────────────────
  courses: {
    list: '/api/courses',
    popular: '/api/courses/popular',
    byId: (id: string) => `/api/courses/${id}`,
    lessons: (id: string) => `/api/courses/${id}/lessons`,
    reviews: (id: string) => `/api/courses/${id}/reviews`,
    enroll: (id: string) => `/api/courses/${id}/enroll`,
    unenroll: (id: string) => `/api/courses/${id}/enroll`,
    enrollmentStatus: (id: string) => `/api/courses/${id}/enrollment-status`,
    complete: (id: string) => `/api/courses/${id}/complete`,
    checkout: (id: string) => `/api/courses/${id}/checkout`,
    curriculum: (id: string) => `/api/courses/${id}/curriculum`,
    createReview: (id: string) => `/api/courses/${id}/reviews`,
    lessonProgress: (lessonId: string) => `/api/courses/lessons/${lessonId}/progress`,
    lessonNotes: (lessonId: string) => `/api/courses/lessons/${lessonId}/notes`,
    createNote: (lessonId: string) => `/api/courses/lessons/${lessonId}/notes`,
  },

  // Categories & Teachers
  categories: '/api/categories',
  teachers: '/api/teachers',

  // ──────────────────────────────────────────
  // User Subjects (protected_routes.go)
  // ──────────────────────────────────────────
  subjects: {
    list: '/api/subjects',
    myCourses: '/api/my-courses',
  },

  // ──────────────────────────────────────────
  // Progress & Analytics  (protected_routes.go)
  // ──────────────────────────────────────────
  progress: {
    summary: '/api/progress/summary',
    courses: '/api/users/progress/courses',
    time: '/api/users/progress/time',
    achievements: '/api/users/progress/achievements',
  },
  analytics: {
    weekly: '/api/analytics/weekly',
    time: '/api/analytics/time',
    performance: '/api/analytics/performance',
    predictions: '/api/analytics/predictions',
  },

  // ──────────────────────────────────────────
  // Exams  (public_routes.go + protected_routes.go)
  // ──────────────────────────────────────────
  exams: {
    list: '/api/exams',
    results: '/api/exams/results',
    submit: (id: string) => `/api/exams/${id}/submit`,
  },

  // ──────────────────────────────────────────
  // Schedule, Tasks & Study Sessions  (protected_routes.go)
  // ──────────────────────────────────────────
  schedule: {
    get: '/api/schedule',
    update: '/api/schedule',
  },
  tasks: {
    list: '/api/tasks',
    create: '/api/tasks',
    update: (id: string) => `/api/tasks/${id}`,
    delete: (id: string) => `/api/tasks/${id}`,
  },
  studySessions: {
    list: '/api/study-sessions',
    create: '/api/study-sessions',
  },
  reminders: {
    list: '/api/reminders',
    create: '/api/reminders',
  },
  lessons: {
    list: '/api/lessons',
    create: '/api/lessons',
  },

  // ──────────────────────────────────────────
  // Notifications  (protected_routes.go)
  // ──────────────────────────────────────────
  notifications: {
    list: '/api/notifications',
    unreadCount: '/api/notifications/unread-count',
    markRead: '/api/notifications/mark-read',
    enqueue: '/api/notifications/enqueue',
  },

  // ──────────────────────────────────────────
  // Activities  (protected_routes.go)
  // ──────────────────────────────────────────
  activities: {
    recent: '/api/activities/recent',
    markRead: (id: string) => `/api/activities/${id}/read`,
    readAll: '/api/activities/read-all',
    // Legacy alias
    read: (id: string) => `/api/activities/${id}/read`,
  },

  // ──────────────────────────────────────────
  // Settings  (protected_routes.go)
  // ──────────────────────────────────────────
  settings: {
    preferences: '/api/settings/preferences',
    system: '/api/settings',
  },

  // ──────────────────────────────────────────
  // Users & Profile  (protected_routes.go)
  // ──────────────────────────────────────────
  users: {
    guest: '/api/users/guest',
    profile: '/api/users/profile',
    updateProfile: '/api/users/profile',
    billingSummary: '/api/users/billing-summary',
  },

  // ──────────────────────────────────────────
  // Billing & Subscriptions  (protected_routes.go)
  // ──────────────────────────────────────────
  billing: {
    wallet: '/api/billing/wallet',
    transactions: '/api/billing/wallet/transactions',
    deposit: '/api/billing/wallet',
  },
  subscriptions: {
    plans: '/api/subscriptions/plans',
    current: '/api/subscriptions',
    addons: '/api/subscriptions/addons',
    purchase: '/api/subscriptions/purchase',
    initiatePayment: '/api/subscriptions/initiate-payment',
    cancel: '/api/subscriptions/cancel',
    renew: '/api/subscriptions/renew',
    checkout: '/api/subscriptions/checkout',
  },
  coupons: {
    validate: '/api/coupons/validate',
  },

  // ──────────────────────────────────────────
  // Payments  (protected_routes.go + public_routes.go)
  // ──────────────────────────────────────────
  payments: {
    create: '/api/payments/create',
    history: '/api/payments/history',
    paymobCallback: '/api/payments/paymob/callback',
  },

  // ──────────────────────────────────────────
  // Gamification  (public_routes.go + protected_routes.go)
  // ──────────────────────────────────────────
  gamification: {
    progress: '/api/gamification/progress',
    achievements: '/api/gamification/achievements',
    leaderboard: '/api/gamification/leaderboard',
    goals: '/api/gamification/goals',
    updateGoal: (id: string) => `/api/gamification/goals/${id}`,
  },

  // ──────────────────────────────────────────
  // AI  (public_routes.go — requires auth + rate limit)
  // ──────────────────────────────────────────
  ai: {
    exam: '/api/ai/exam',
    examStatus: (jobId: string) => `/api/ai/exam/status/${jobId}`,
    suggest: '/api/ai/suggest',
    chat: '/api/ai/chat',
    tips: '/api/ai/tips',
    conversations: '/api/ai/conversations',
    conversation: (id: string) => `/api/ai/conversation/${id}`,
    deleteConversation: (id: string) => `/api/ai/conversation/${id}`,
    explainMistake: '/api/ai/explain-mistake',
    studyPlanner: '/api/ai/study-planner',
    summarize: '/api/ai/summarize',
    summarizeStatus: (jobId: string) => `/api/ai/summarize/status/${jobId}`,
    gradeEssay: '/api/ai/grade-essay',
    gradeEssayStatus: (jobId: string) => `/api/ai/grade-essay/status/${jobId}`,
    recommendations: '/api/ai/recommendations',
    trackRecommendation: '/api/ai/recommendations/track',
  },

  // ──────────────────────────────────────────
  // Search  (protected_routes.go)
  // ──────────────────────────────────────────
  search: {
    global: '/api/search',
  },

  // ──────────────────────────────────────────
  // Library  (public_routes.go + protected_routes.go)
  // ──────────────────────────────────────────
  library: {
    books: '/api/library/books',
    createBook: '/api/library/books',
    categories: '/api/library/categories',
  },

  // ──────────────────────────────────────────
  // Forum  (public_routes.go)
  // ──────────────────────────────────────────
  forum: {
    categories: '/api/forum/categories',
    posts: '/api/forum/posts',
    createPost: '/api/forum/posts',
    post: (id: string) => `/api/forum/posts/${id}`,
    incrementView: (id: string) => `/api/forum/posts/${id}/view`,
    replies: (id: string) => `/api/forum/posts/${id}/replies`,
    createReply: (id: string) => `/api/forum/posts/${id}/replies`,
  },

  // ──────────────────────────────────────────
  // Community  (public_routes.go)
  // ──────────────────────────────────────────
  community: {
    announcements: '/api/announcements',
    createAnnouncement: '/api/announcements',
    chat: {
      conversations: (userId: string) => `/api/chat/conversations/${userId}`,
      messages: (userId: string, chatUserId: string) =>
        `/api/chat/messages/${userId}/${chatUserId}`,
      sendMessage: '/api/chat/messages',
    },
  },

  // ──────────────────────────────────────────
  // Teaching Dashboard (protected_routes.go)
  // ──────────────────────────────────────────
  teaching: {
    dashboard: {
      stats: '/api/teaching/dashboard/stats',
    },
    courses: {
      list: '/api/teaching/courses',
      create: '/api/teaching/courses',
      byId: (id: string) => `/api/teaching/courses/${id}`,
      students: (id: string) => `/api/teaching/courses/${id}/students`,
      reviews: (id: string) => `/api/teaching/courses/${id}/reviews`,
    },
    students: {
      all: '/api/teaching/students',
    },
    reviews: {
      all: '/api/teaching/reviews',
      reply: (id: string) => `/api/teaching/reviews/${id}/reply`,
    },
    activities: '/api/teaching/activities',
    notifications: {
      list: '/api/teaching/notifications',
      markRead: (id: string) => `/api/teaching/notifications/${id}/read`,
      markAllRead: '/api/teaching/notifications/read-all',
    },
    apply: '/api/teaching/apply',
  },

  // ──────────────────────────────────────────
  // Blog  (public_routes.go)
  // ──────────────────────────────────────────
  blog: {
    list: '/api/blog',
    bySlug: (slug: string) => `/api/blog/${slug}`,
    categories: '/api/blog/categories',
  },

  // ──────────────────────────────────────────
  // Events & Resources  (public_routes.go)
  // ──────────────────────────────────────────
  events: {
    list: '/api/events',
  },
  resources: {
    list: '/api/resources',
  },

  // ──────────────────────────────────────────
  // Upload  (protected_routes.go)
  // ──────────────────────────────────────────
  upload: {
    presign: '/api/upload/presign',
    single: '/api/upload',
    delete: '/api/upload',
    chunked: '/api/upload/chunked',
    status: (uploadId: string) => `/api/upload/chunked/${uploadId}/status`,
  },

  // ──────────────────────────────────────────
  // WebSocket  (public_routes.go)
  // ──────────────────────────────────────────
  ws: '/api/ws',

  // ──────────────────────────────────────────
  // Events Ingest  (protected_routes.go)
  // ──────────────────────────────────────────
  eventsIngest: '/api/events/ingest',

  // ──────────────────────────────────────────
  // Navigation / Mega Menu
  // ──────────────────────────────────────────
  navigation: {
    menu: '/api/navigation/menu',
    main: '/api/navigation/main',
  },

  // ──────────────────────────────────────────
  // Admin  (admin_routes.go)
  // ──────────────────────────────────────────
  admin: {
    dashboard: '/api/admin/dashboard',
    ai: '/api/admin/ai',
    live: '/api/admin/live',
    analytics: '/api/admin/analytics',
    revenue: '/api/admin/analytics/revenue',
    journeys: '/api/admin/analytics/journeys',
    activityMetrics: '/api/admin/analytics/metrics',
    metricsHistory: '/api/admin/metrics/history',
    infrastructureStats: '/api/admin/infrastructure/stats',
    announcements: '/api/admin/announcements',
    notificationBroadcast: '/api/admin/notifications/broadcast',
    reportsOverview: '/api/admin/reports/overview',
    reportsUsers: '/api/admin/reports/users',
    reportsBooks: '/api/admin/reports/books',
    reportsContent: '/api/admin/reports/content',
    users: '/api/admin/users',
    teachers: '/api/admin/teachers',
    subjects: '/api/admin/subjects',
    courses: '/api/admin/courses',
    exams: '/api/admin/exams',
    courseCategories: '/api/admin/course-categories',
    payments: '/api/admin/payments',
    coupons: '/api/admin/coupons',
    settings: '/api/admin/settings',
    challenges: '/api/admin/challenges',
    rewards: '/api/admin/rewards',
    achievements: '/api/admin/achievements',
    seasons: '/api/admin/seasons',
    blog: '/api/admin/blog',
    forum: '/api/admin/forum',
    forumCategories: '/api/admin/forum-categories',
    events: '/api/admin/events',
    automations: '/api/admin/automations',
    abTesting: '/api/admin/ab-testing',
    books: '/api/admin/books',
    bookReviews: '/api/admin/books/reviews',
    bookViews: '/api/admin/books/views',
    auditLogs: '/api/admin/audit-logs',
    resources: '/api/admin/resources',
    impersonate: '/api/admin/impersonate',
    marketing: '/api/admin/marketing',
    marketingCampaigns: '/api/admin/marketing/campaigns',
    contests: '/api/admin/contests',
    tickets: '/api/admin/tickets',
    backups: '/api/admin/backups',
    // Dynamic admin routes
    wallet: (userId: string) => `/api/admin/users/${userId}/wallet/transactions`,
    courseAnalytics: (courseId: string) => `/api/admin/courses/${courseId}/analytics`,
    courseCurriculum: (courseId: string) => `/api/admin/courses/${courseId}/curriculum`,
    courseEnrollments: (courseId: string) => `/api/admin/courses/${courseId}/enrollments`,
  },
} as const;

export type ApiRoutes = typeof apiRoutes;
