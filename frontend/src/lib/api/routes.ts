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
    register: '/api/v1/auth/register',
    login: '/api/v1/auth/login',
    logout: '/api/v1/auth/logout',
    me: '/api/v1/auth/me',
    reauthenticate: '/api/v1/auth/reauthenticate',
    refresh: '/api/v1/auth/refresh',
    refreshSession: '/api/v1/auth/refresh-session',
    deleteAccount: '/api/v1/auth/account',
    cancelAccountDeletion: '/api/v1/auth/account-deletion/cancel',
    validateToken: '/api/v1/auth/validate-token',
    forgotPassword: '/api/v1/auth/forgot-password',
    resetPassword: '/api/v1/auth/reset-password',
    changePassword: '/api/v1/auth/change-password',
    verifyEmail: '/api/v1/auth/verify-email',
    resendVerification: '/api/v1/auth/resend-verification',
    phone: {
      sendCode: '/api/v1/auth/phone/send-code',
      verify: '/api/v1/auth/phone/verify',
    },
    emailChange: {
      request: '/api/v1/auth/email/change',
      verify: '/api/v1/auth/email/change/verify',
    },
    passkeys: {
      list: '/api/v1/auth/passkeys',
      registerStart: '/api/v1/auth/passkeys/register/start',
      registerFinish: '/api/v1/auth/passkeys/register/finish',
      loginStart: '/api/v1/auth/passkeys/login/start',
      loginFinish: '/api/v1/auth/passkeys/login/finish',
      remove: (id: string) => `/api/v1/auth/passkeys/${id}`,
    },
    recovery: {
      initiate: '/api/v1/auth/recovery/initiate',
      finalize: '/api/v1/auth/recovery/finalize',
    },
    mfa: {
      setup: '/api/v1/auth/mfa/setup',
      enable: '/api/v1/auth/mfa/enable',
      disable: '/api/v1/auth/mfa/disable',
      recoveryCodes: {
        status: '/api/v1/auth/mfa/recovery-codes',
        regenerate: '/api/v1/auth/mfa/recovery-codes/regenerate',
        revoke: '/api/v1/auth/mfa/recovery-codes/revoke',
      },
      // The single MFA challenge endpoint. A second alias ('/api/auth/2fa/verify')
      // used to live here and was never called; having two spellings for one
      // operation is how the login/MFA contract drifted apart in the first place.
      verify: '/api/v1/auth/mfa/verify',
    },
    social: {
      login: (provider: string) => `/api/v1/auth/social/${provider}`,
      linkRedirect: (provider: string) => `/api/v1/auth/social/${provider}/link`,
      callback: (provider: string) => `/api/v1/auth/callback/${provider}`,
      link: '/api/v1/auth/social/link',
      unlink: '/api/v1/auth/social/unlink',
      accounts: '/api/v1/auth/social/accounts',
    },
    magicLink: {
      request: '/api/v1/auth/magic-link/request',
      verify: '/api/v1/auth/magic-link/verify',
    },
    sessions: {
      list: '/api/v1/auth/sessions',
      revoke: (id: string) => `/api/v1/auth/sessions/${id}`,
      revokeOthers: '/api/v1/auth/sessions/revoke-others',
    },
    securityEvents: '/api/v1/auth/security-events',
  },

  // ──────────────────────────────────────────
  // Courses / Subjects  (public_routes.go + protected_routes.go)
  // ──────────────────────────────────────────
  courses: {
    list: '/api/courses',
    popular: '/api/courses/popular',
    byId: (id: string) => `/api/courses/${id}`,
    detail: (id: string) => `/api/courses/${id}/detail`,
    lessons: (id: string) => `/api/courses/${id}/lessons`,
    lessonsAccess: (id: string) => `/api/courses/${id}/lessons/access`,
    reviews: (id: string) => `/api/courses/${id}/reviews`,
    reviewComments: (reviewId: string) => `/api/courses/reviews/${reviewId}/comments`,
    reviewComment: (commentId: string) => `/api/courses/reviews/comments/${commentId}`,
    enroll: (id: string) => `/api/courses/${id}/enroll`,
    eligibility: (id: string) => `/api/courses/${id}/eligibility`,
    unenroll: (id: string) => `/api/courses/${id}/enroll`,
    enrollmentStatus: (id: string) => `/api/courses/${id}/enrollment-status`,
    complete: (id: string) => `/api/courses/${id}/complete`,
    checkout: (id: string) => `/api/courses/${id}/checkout`,
    wishlist: (id: string) => `/api/courses/${id}/wishlist`,
    wishlistList: '/api/wishlist',
    curriculum: (id: string) => `/api/courses/${id}/curriculum`,
    createReview: (id: string) => `/api/courses/${id}/reviews`,
    questions: (id: string) => `/api/courses/${id}/questions`,
    questionAnswers: (questionId: string) => `/api/questions/${questionId}/answers`,
    lessonProgress: (lessonId: string) => `/api/courses/lessons/${lessonId}/progress`,
    lessonNotes: (lessonId: string) => `/api/courses/lessons/${lessonId}/notes`,
    createNote: (lessonId: string) => `/api/courses/lessons/${lessonId}/notes`,
    lessonQuestions: (lessonId: string) => `/api/courses/lessons/${lessonId}/questions`,
    answerLessonQuestion: (lessonId: string, questionId: string) =>
      `/api/courses/lessons/${lessonId}/questions/${questionId}/answer`,
    lessonInteractiveQuestions: (lessonId: string) =>
      `/api/courses/lessons/${lessonId}/interactive-questions`,
    lessonTranscript: (lessonId: string) => `/api/courses/lessons/${lessonId}/transcript`,
    quizzes: (id: string) => `/api/courses/${id}/quizzes`,
    lessonQuizzes: (courseId: string, lessonId: string) => `/api/courses/${courseId}/lessons/${lessonId}/quizzes`,
    quiz: (id: string, quizId: string) => `/api/courses/${id}/quizzes/${quizId}`,
    submitQuiz: (id: string, quizId: string) => `/api/courses/${id}/quizzes/${quizId}/submit`,
    startQuiz: (id: string, quizId: string) => `/api/courses/${id}/quizzes/${quizId}/start`,
    quizResults: (id: string, quizId: string) => `/api/courses/${id}/quizzes/${quizId}/results`,
    certificate: (id: string) => `/api/courses/${id}/certificate`,
  },

  // Categories & Teachers
  categories: '/api/categories',
  teachers: {
    list: '/api/teachers',
    profile: (id: string) => `/api/teachers/${encodeURIComponent(id)}/profile`,
    courses: (id: string) => `/api/teachers/${encodeURIComponent(id)}/courses`,
    reviews: (id: string) => `/api/teachers/${encodeURIComponent(id)}/reviews`,
    related: (id: string) => `/api/teachers/${encodeURIComponent(id)}/related`,
  },

  // Certificate verification (public, no auth)
  verifyCertificate: (no: string) => `/api/certificates/verify/${encodeURIComponent(no)}`,

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
    byId: (id: string) => `/api/exams/${id}`,
    results: '/api/exams/results',
    result: (id: string) => `/api/exams/results/${id}`,
    submit: (id: string) => `/api/exams/${id}/submit`,
  },

  // ──────────────────────────────────────────
  // Grades  (protected_routes.go)
  // ──────────────────────────────────────────
  grades: {
    list: '/api/grades',
    byId: (id: string) => `/api/grades/${id}`,
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
    byId: (id: string) => `/api/reminders/${id}`,
  },
  lessons: {
    list: '/api/lessons',
    create: '/api/lessons',
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
    privacyActions: '/api/settings/privacy/actions',
    exportJobStatus: (id: string) => `/api/users/export/${id}/status`,
    exportDownload: (id: string, token: string) => `/api/users/export/${id}/download/${token}`,
  },
  // ──────────────────────────────────────────
  // Users & Profile  (protected_routes.go)
  // ──────────────────────────────────────────
  users: {
    guest: '/api/users/guest',
    billingSummary: '/api/users/billing-summary',
    profile: '/api/users/profile',
    referrals: '/api/users/referrals',
  },
  teacherApplications: {
    submit: '/api/teacher-applications',
    me: '/api/teacher-applications/me',
  },

  // ──────────────────────────────────────────
  // Billing & Subscriptions  (protected_routes.go)
  // ──────────────────────────────────────────
  billing: {
    wallet: '/api/billing/wallet',
    transactions: '/api/billing/wallet/transactions',
    deposit: '/api/billing/wallet',
    // Wallet top-up goes through the generic payment-init endpoint.
    // There is no backend route at /billing/wallet/topup (that path 404s
    // through the /api/[...path] proxy) — top-ups are created via
    // POST /api/payments/create with { amount, method } (`method` is what
    // the backend `CreatePaymentRequest.Method` validator requires;
    // `paymentMethod` is also sent as an alias).
    topup: '/api/payments/create',
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
  // Cart  (protected_routes.go)
  // ──────────────────────────────────────────
  cart: {
    get: '/api/cart',
    items: '/api/cart/items',
    item: (subjectId: string) => `/api/cart/items/${subjectId}`,
    checkout: '/api/cart/checkout',
  },

  // ──────────────────────────────────────────
  // Payments  (protected_routes.go + public_routes.go)
  // ──────────────────────────────────────────
  payments: {
    create: '/api/payments/create',
    history: '/api/payments/history',
    paymobCallback: '/api/payments/paymob/callback',
    byOrder: (orderId: string) => `/api/payments/by-order/${orderId}`,
  },

  // ──────────────────────────────────────────
  // Refunds  (protected_routes.go + admin)
  // ──────────────────────────────────────────
  refunds: {
    list: '/api/refunds',
    create: '/api/refunds',
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
    examStatusBase: '/api/ai/exam/status',
    examStatus: (jobId: string) => `/api/ai/exam/status/${jobId}`,
    suggest: '/api/ai/suggest',
    chat: '/api/ai/chat',
    tips: '/api/ai/tips',
    teachers: '/api/ai/teachers',
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
  // Support & Help Center
  // ──────────────────────────────────────────
  support: {
    faqs: '/api/v1/support/faqs',
    articles: '/api/v1/support/articles',
    article: (slug: string) => `/api/v1/support/articles/${encodeURIComponent(slug)}`,
    articleVote: (slug: string) => `/api/v1/support/articles/${encodeURIComponent(slug)}/vote`,
    status: '/api/v1/support/status',
    incidents: '/api/v1/support/incidents',
    myTickets: '/api/v1/support/tickets',
    myTicket: (id: string) => `/api/v1/support/tickets/${encodeURIComponent(id)}`,
    myTicketMessages: (id: string) => `/api/v1/support/tickets/${encodeURIComponent(id)}/messages`,
    myTicketClose: (id: string) => `/api/v1/support/tickets/${encodeURIComponent(id)}/close`,
    myTicketReopen: (id: string) => `/api/v1/support/tickets/${encodeURIComponent(id)}/reopen`,
    myTicketRating: (id: string) => `/api/v1/support/tickets/${encodeURIComponent(id)}/rating`,
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
    users: '/api/community/users',
    userById: (id: string) => `/api/community/users/${id}`,
    // Session-scoped: the caller's identity comes from the JWT, so the
    // conversations endpoint takes no userId and the messages endpoint takes
    // only the counterpart user id (IDOR/BOLA hardening).
    chat: {
      conversations: '/api/chat/conversations',
      messages: (chatUserId: string) => `/api/chat/messages/${chatUserId}`,
      sendMessage: '/api/chat/messages',
    },
  },

  // ──────────────────────────────────────────
  // Contests  (public_routes.go)
  // ──────────────────────────────────────────
  contests: {
    list: '/api/contests',
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
      pricing: (id: string) => `/api/teaching/courses/${id}/pricing`,
      revokeCertificate: (id: string, certId: string) =>
        `/api/teaching/courses/${id}/certificates/${certId}/revoke`,
    },
    bundles: {
      list: '/api/teaching/bundles',
      create: '/api/teaching/bundles',
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
    conversations: '/api/teaching/conversations',
    messages: (conversationId: string) => `/api/teaching/conversations/${conversationId}/messages`,
    calendar: '/api/teaching/calendar',
    transactions: '/api/teaching/transactions',
    analytics: '/api/teaching/analytics',
    earningsSummary: '/api/teaching/earnings/summary',
    apply: '/api/teaching/apply',
  },

  // ──────────────────────────────────────────
  // Blog  (public_routes.go)
  // ──────────────────────────────────────────
  blog: {
    list: '/api/blog',
    bySlug: (slug: string) => `/api/blog/${slug}`,
    categories: '/api/blog/categories',
    posts: '/api/blog/posts',
    post: (id: string) => `/api/blog/posts/${id}`,
    incrementView: (id: string) => `/api/blog/posts/${id}/view`,
  },

  // ──────────────────────────────────────────
  // Events & Resources  (public_routes.go)
  // ──────────────────────────────────────────
  events: {
    list: '/api/events',
    byId: (id: string) => `/api/events/${id}`,
    attendees: (id: string) => `/api/events/${id}/attendees`,
    attend: (id: string) => `/api/events/${id}/attend`,
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
    sendActivationLink: (userId: string) => `/api/admin/users/${userId}/send-activation-link`,
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
