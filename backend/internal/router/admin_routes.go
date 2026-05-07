package router

import (
	"github.com/gin-gonic/gin"
	"thanawy-backend/internal/api/handlers"
	"thanawy-backend/internal/middleware"
	"thanawy-backend/internal/models"
)

// SetupAdminRoutesWithDependencies configures admin routes with all middleware
func SetupAdminRoutesWithDependencies(
	router *gin.Engine,
	rateLimiter *middleware.AdvancedRateLimiter,
	auditLogger *middleware.AdminAuditLogger,
) {
	admin := router.Group("/api/admin")
	admin.Use(middleware.Auth())
	admin.Use(middleware.AdminRequired())
	admin.Use(middleware.IPWhitelistMiddleware()) // IP Whitelist check
	admin.Use(rateLimiter.AdminRateLimiter())
	admin.Use(auditLogger.LogAdminOperations())
	{
		setupAdminRoutes(admin)
	}
}

// setupAdminRoutes defines all admin route handlers
func setupAdminRoutes(admin *gin.RouterGroup) {
	admin.GET("/dashboard", middleware.PermissionRequired(models.PermDashboardView), handlers.GetAdminDashboard)
	admin.GET("/live", middleware.PermissionRequired(models.PermLiveMonitorView), handlers.GetAdminLive)
	admin.GET("/analytics", middleware.PermissionRequired(models.PermAnalyticsView), handlers.GetAdminAnalytics)
	admin.GET("/infrastructure/stats", middleware.PermissionRequired(models.PermLiveMonitorView), handlers.GetAdminInfrastructureStats)
	admin.GET("/metrics/history", middleware.PermissionRequired(models.PermAnalyticsView), handlers.GetAdminMetricsHistory)
	admin.GET("/reports/overview", middleware.PermissionRequired(models.PermReportsView), handlers.GetAdminReportsOverview)
	admin.GET("/reports/books", middleware.PermissionRequired(models.PermReportsView), handlers.GetAdminReportsBooks)
	admin.GET("/reports/users", middleware.PermissionRequired(models.PermReportsView), handlers.GetAdminReportsUsers)
	admin.GET("/announcements", middleware.PermissionRequired(models.PermAnnouncementsView), handlers.GetAdminAnnouncements)

	// User Management
	admin.GET("/users", middleware.PermissionRequired(models.PermUsersView), handlers.GetUsers)
	admin.GET("/users/:id", middleware.PermissionRequired(models.PermUsersView), handlers.GetUserByID)
	admin.POST("/users", middleware.PermissionRequired(models.PermUsersManage), handlers.CreateUser)
	admin.PATCH("/users", middleware.PermissionRequired(models.PermUsersManage), handlers.UpdateUser)
	admin.PATCH("/users/:id", middleware.PermissionRequired(models.PermUsersManage), handlers.UpdateUser)
	admin.DELETE("/users", middleware.PermissionRequired(models.PermUsersManage), handlers.DeleteUser)
	admin.DELETE("/users/:id", middleware.PermissionRequired(models.PermUsersManage), handlers.DeleteUser)

	// Wallet Management
	admin.GET("/users/:id/wallet/transactions", middleware.PermissionRequired(models.PermUsersView), handlers.GetUserWalletTransactions)
	admin.POST("/users/wallet", middleware.PermissionRequired(models.PermUsersManage), handlers.ProcessWalletTransaction)

	admin.POST("/impersonate", middleware.PermissionRequired(models.PermAdminBypass), handlers.ImpersonateUser)
	admin.DELETE("/impersonate", middleware.PermissionRequired(models.PermAdminBypass), handlers.DeleteImpersonation)
	admin.POST("/users/bulk-send-message", middleware.PermissionRequired(models.PermUsersManage), handlers.AdminBulkSendMessage)

	// Teacher Management
	admin.GET("/teachers", middleware.PermissionRequired(models.PermTeachersView), handlers.GetTeachers)
	admin.POST("/teachers", middleware.PermissionRequired(models.PermTeachersManage), handlers.CreateTeacher)
	admin.PATCH("/teachers", middleware.PermissionRequired(models.PermTeachersManage), handlers.UpdateTeacher)
	admin.DELETE("/teachers", middleware.PermissionRequired(models.PermTeachersManage), handlers.DeleteTeacher)

	// Subject Management
	admin.GET("/subjects", middleware.PermissionRequired(models.PermSubjectsView), handlers.GetSubjects)
	admin.GET("/subjects/:id", middleware.PermissionRequired(models.PermSubjectsView), handlers.GetSubject)
	admin.POST("/subjects", middleware.PermissionRequired(models.PermSubjectsManage), handlers.CreateSubject)
	admin.PATCH("/subjects", middleware.PermissionRequired(models.PermSubjectsManage), handlers.UpdateSubject)
	admin.DELETE("/subjects", middleware.PermissionRequired(models.PermSubjectsManage), handlers.DeleteSubject)

	// Course Management
	admin.GET("/courses", middleware.PermissionRequired(models.PermSubjectsView), handlers.GetSubjects)
	admin.GET("/courses/export", middleware.PermissionRequired(models.PermSubjectsView), handlers.AdminCourseAction)
	admin.GET("/courses/:id", middleware.PermissionRequired(models.PermSubjectsView), handlers.GetSubject)
	admin.DELETE("/courses", middleware.PermissionRequired(models.PermSubjectsManage), handlers.DeleteSubject)
	admin.GET("/course-categories", middleware.PermissionRequired(models.PermSubjectsView), handlers.GetCategories)
	admin.POST("/course-categories", middleware.PermissionRequired(models.PermSubjectsManage), handlers.CreateCategory)
	admin.PATCH("/course-categories", middleware.PermissionRequired(models.PermSubjectsManage), handlers.UpdateCategory)
	admin.DELETE("/course-categories", middleware.PermissionRequired(models.PermSubjectsManage), handlers.DeleteCategory)

	// Admin AI
	admin.GET("/ai", middleware.PermissionRequired(models.PermAiManage), handlers.AdminAIGet)
	admin.POST("/ai", middleware.PermissionRequired(models.PermAiManage), handlers.AdminAIPost)

	// Admin Events
	admin.GET("/events", middleware.PermissionRequired(models.PermEventsView), handlers.AdminGetEvents)
	admin.POST("/events", middleware.PermissionRequired(models.PermEventsManage), handlers.AdminCreateEvent)
	admin.PATCH("/events", middleware.PermissionRequired(models.PermEventsManage), handlers.AdminUpdateEvent)
	admin.DELETE("/events", middleware.PermissionRequired(models.PermEventsManage), handlers.AdminDeleteEvent)
	admin.POST("/announcements", middleware.PermissionRequired(models.PermAnnouncementsManage), handlers.CreateAdminAnnouncement)
	admin.PATCH("/announcements", middleware.PermissionRequired(models.PermAnnouncementsManage), handlers.UpdateAdminAnnouncement)
	admin.DELETE("/announcements", middleware.PermissionRequired(models.PermAnnouncementsManage), handlers.DeleteAdminAnnouncement)

	// Admin Course Management
	admin.POST("/courses", middleware.PermissionRequired(models.PermSubjectsManage), handlers.CreateSubject)
	admin.PATCH("/courses", middleware.PermissionRequired(models.PermSubjectsManage), handlers.UpdateSubject)
	admin.DELETE("/courses/:id", middleware.PermissionRequired(models.PermSubjectsManage), handlers.DeleteSubject)
	admin.POST("/courses/duplicate", middleware.PermissionRequired(models.PermSubjectsManage), handlers.AdminCourseAction)
	admin.POST("/courses/batch", middleware.PermissionRequired(models.PermSubjectsManage), handlers.AdminCourseAction)
	admin.GET("/courses/:id/curriculum", middleware.PermissionRequired(models.PermSubjectsView), handlers.GetSubjectCurriculum)
	admin.PATCH("/courses/:id/curriculum", middleware.PermissionRequired(models.PermSubjectsManage), handlers.UpdateCourseCurriculum)
	admin.PUT("/courses/:id/curriculum", middleware.PermissionRequired(models.PermSubjectsManage), handlers.UpdateCourseCurriculum)
	admin.POST("/courses/lessons/:id/attachments", middleware.PermissionRequired(models.PermSubjectsManage), handlers.AddLessonAttachment)
	admin.GET("/courses/:id/enrollments", middleware.PermissionRequired(models.PermSubjectsView), handlers.GetCourseEnrollments)
	admin.POST("/courses/:id/enrollments", middleware.PermissionRequired(models.PermSubjectsManage), handlers.ManualEnroll)
	admin.DELETE("/courses/:id/enrollments/:userId", middleware.PermissionRequired(models.PermSubjectsManage), handlers.UnenrollUser)

	// Admin Exams
	admin.GET("/exams", middleware.PermissionRequired(models.PermExamsView), handlers.GetExams)
	admin.POST("/exams", middleware.PermissionRequired(models.PermExamsManage), handlers.CreateExam)
	admin.PATCH("/exams", middleware.PermissionRequired(models.PermExamsManage), handlers.UpdateExam)
	admin.DELETE("/exams", middleware.PermissionRequired(models.PermExamsManage), handlers.DeleteExam)
	admin.POST("/exams/bulk", middleware.PermissionRequired(models.PermExamsManage), handlers.AdminExamsBulkUpload)

	// Admin Payments & Revenue
	admin.GET("/payments", middleware.PermissionRequired(models.PermAnalyticsView), handlers.GetAdminPayments)
	admin.GET("/analytics/revenue", middleware.PermissionRequired(models.PermAnalyticsView), handlers.GetAdminRevenue)

	// Admin Contests
	admin.GET("/contests", middleware.PermissionRequired(models.PermContestsView), handlers.Contests)
	admin.POST("/contests", middleware.PermissionRequired(models.PermContestsManage), handlers.Contests)
	admin.PATCH("/contests/:id", middleware.PermissionRequired(models.PermContestsManage), handlers.Contests)
	admin.DELETE("/contests/:id", middleware.PermissionRequired(models.PermContestsManage), handlers.Contests)

	// Compatibility endpoints
	// Admin Gamification
	admin.GET("/achievements", middleware.PermissionRequired(models.PermAchievementsView), handlers.AdminGetAchievements)
	admin.POST("/achievements", middleware.PermissionRequired(models.PermAchievementsManage), handlers.AdminCreateAchievement)
	admin.PATCH("/achievements/:id", middleware.PermissionRequired(models.PermAchievementsManage), handlers.AdminUpdateAchievement)
	admin.DELETE("/achievements/:id", middleware.PermissionRequired(models.PermAchievementsManage), handlers.AdminDeleteAchievement)

	admin.GET("/rewards", middleware.PermissionRequired(models.PermRewardsView), handlers.AdminGetRewards)
	admin.POST("/rewards", middleware.PermissionRequired(models.PermRewardsManage), handlers.AdminCreateReward)
	admin.PATCH("/rewards/:id", middleware.PermissionRequired(models.PermRewardsManage), handlers.AdminUpdateReward)
	admin.DELETE("/rewards/:id", middleware.PermissionRequired(models.PermRewardsManage), handlers.AdminDeleteReward)

	admin.GET("/seasons", middleware.PermissionRequired(models.PermSeasonsView), handlers.AdminGetSeasons)
	admin.POST("/seasons", middleware.PermissionRequired(models.PermSeasonsManage), handlers.AdminCreateSeason)
	admin.PATCH("/seasons/:id", middleware.PermissionRequired(models.PermSeasonsManage), handlers.AdminUpdateSeason)
	admin.DELETE("/seasons/:id", middleware.PermissionRequired(models.PermSeasonsManage), handlers.AdminDeleteSeason)

	admin.GET("/challenges", middleware.PermissionRequired(models.PermChallengesView), handlers.AdminGetChallenges)
	admin.POST("/challenges", middleware.PermissionRequired(models.PermChallengesManage), handlers.AdminCreateChallenge)
	admin.PATCH("/challenges/:id", middleware.PermissionRequired(models.PermChallengesManage), handlers.AdminUpdateChallenge)
	admin.DELETE("/challenges/:id", middleware.PermissionRequired(models.PermChallengesManage), handlers.AdminDeleteChallenge)

	// Admin Marketing & Content
	admin.GET("/coupons", middleware.PermissionRequired(models.PermMarketingView), handlers.AdminGetCoupons)
	admin.POST("/coupons", middleware.PermissionRequired(models.PermMarketingView), handlers.AdminCreateCoupon)
	admin.PATCH("/coupons/:id", middleware.PermissionRequired(models.PermMarketingView), handlers.AdminUpdateCoupon)
	admin.DELETE("/coupons/:id", middleware.PermissionRequired(models.PermMarketingView), handlers.AdminDeleteCoupon)

	// Campaign Management
	admin.GET("/marketing", middleware.PermissionRequired(models.PermMarketingView), handlers.AdminGetCampaigns)
	admin.POST("/marketing", middleware.PermissionRequired(models.PermMarketingManage), handlers.AdminCreateCampaign)
	admin.GET("/marketing/campaigns", middleware.PermissionRequired(models.PermMarketingView), handlers.AdminGetCampaigns)
	admin.POST("/marketing/campaigns", middleware.PermissionRequired(models.PermMarketingManage), handlers.AdminCreateCampaign)
	admin.PATCH("/marketing/campaigns/:id", middleware.PermissionRequired(models.PermMarketingManage), handlers.AdminUpdateCampaign)
	admin.DELETE("/marketing/campaigns/:id", middleware.PermissionRequired(models.PermMarketingManage), handlers.AdminDeleteCampaign)

	admin.GET("/blog", middleware.PermissionRequired(models.PermBlogView), handlers.AdminGetBlog)
	admin.POST("/blog", middleware.PermissionRequired(models.PermBlogManage), handlers.AdminCreateBlogPost)
	admin.PATCH("/blog/:id", middleware.PermissionRequired(models.PermBlogManage), handlers.AdminUpdateBlogPost)
	admin.DELETE("/blog/:id", middleware.PermissionRequired(models.PermBlogManage), handlers.AdminDeleteBlogPost)

	admin.GET("/forum", middleware.PermissionRequired(models.PermForumView), handlers.AdminGetForum)
	admin.GET("/forum-categories", middleware.PermissionRequired(models.PermForumView), handlers.AdminGetForumCategories)
	admin.POST("/forum-categories", middleware.PermissionRequired(models.PermForumManage), handlers.AdminCreateForumCategory)

	admin.GET("/automations", middleware.PermissionRequired(models.PermAdminBypass), handlers.AdminGetAutomations)
	admin.POST("/automations", middleware.PermissionRequired(models.PermAdminBypass), handlers.AdminCreateAutomation)
	admin.PATCH("/automations/:id", middleware.PermissionRequired(models.PermAdminBypass), handlers.AdminUpdateAutomation)
	admin.DELETE("/automations/:id", middleware.PermissionRequired(models.PermAdminBypass), handlers.AdminDeleteAutomation)

	admin.GET("/ab-testing", middleware.PermissionRequired(models.PermAbTestingView), handlers.AdminGetABTests)
	admin.POST("/ab-testing", middleware.PermissionRequired(models.PermAbTestingView), handlers.AdminCreateABTest)
	admin.PATCH("/ab-testing/:id", middleware.PermissionRequired(models.PermAbTestingView), handlers.AdminUpdateABTest)
	admin.DELETE("/ab-testing/:id", middleware.PermissionRequired(models.PermAbTestingView), handlers.AdminDeleteABTest)

	admin.GET("/books", middleware.PermissionRequired(models.PermBooksView), handlers.AdminGetBooks)
	admin.POST("/books", middleware.PermissionRequired(models.PermBooksManage), handlers.AdminCreateBook)
	admin.PATCH("/books/:id", middleware.PermissionRequired(models.PermBooksManage), handlers.AdminUpdateBook)
	admin.DELETE("/books/:id", middleware.PermissionRequired(models.PermBooksManage), handlers.AdminDeleteBook)

	// Admin Logs & Reporting
	admin.GET("/audit-logs", middleware.PermissionRequired(models.PermAuditLogsView), handlers.AdminGetAuditLogs)
	admin.GET("/reports/content", middleware.PermissionRequired(models.PermReportsView), handlers.AdminReportsContent)
	admin.PATCH("/reports/content", middleware.PermissionRequired(models.PermReportsView), handlers.AdminReportsContent)
	admin.GET("/books/reviews", middleware.PermissionRequired(models.PermBooksView), handlers.AdminBookReviews)
	admin.DELETE("/books/reviews", middleware.PermissionRequired(models.PermBooksManage), handlers.AdminBookReviews)
	admin.GET("/books/views", middleware.PermissionRequired(models.PermBooksView), handlers.AdminBookReviews)
	admin.GET("/settings", middleware.PermissionRequired(models.PermSettingsView), handlers.AdminSettings)
	admin.PATCH("/settings", middleware.PermissionRequired(models.PermSettingsView), handlers.AdminSettings)
	admin.GET("/resources", middleware.PermissionRequired(models.PermResourcesView), handlers.AdminGetResources)
	admin.POST("/resources", middleware.PermissionRequired(models.PermResourcesManage), handlers.AdminCreateResource)
	admin.PATCH("/resources", middleware.PermissionRequired(models.PermResourcesManage), handlers.AdminUpdateResource)
	admin.DELETE("/resources", middleware.PermissionRequired(models.PermResourcesManage), handlers.AdminDeleteResource)

	// Advanced Search Endpoints with Cursor Pagination
	admin.GET("/search/users", middleware.PermissionRequired(models.PermUsersView), handlers.SearchUsers)
	admin.GET("/search/content", middleware.PermissionRequired(models.PermSubjectsView), handlers.SearchContent)

	// Unified Notification System
	admin.GET("/notifications", middleware.PermissionRequired(models.PermAnnouncementsManage), handlers.AdminListNotifications)
	admin.POST("/notifications/:id/read", middleware.PermissionRequired(models.PermAnnouncementsManage), handlers.AdminMarkNotificationRead)
	admin.POST("/notifications/read-all", middleware.PermissionRequired(models.PermAnnouncementsManage), handlers.AdminMarkAllNotificationsRead)
	admin.DELETE("/notifications/:id", middleware.PermissionRequired(models.PermAnnouncementsManage), handlers.AdminDeleteNotification)
	admin.GET("/broadcasts", middleware.PermissionRequired(models.PermAnnouncementsManage), handlers.GetBroadcasts)
	admin.POST("/notifications/broadcast", middleware.PermissionRequired(models.PermAnnouncementsManage), handlers.SendNotificationBroadcast)
	admin.POST("/notifications/schedule", middleware.PermissionRequired(models.PermAnnouncementsManage), handlers.ScheduleNotificationBroadcast)
	admin.POST("/notifications/broadcast/:broadcastId/cancel", middleware.PermissionRequired(models.PermAnnouncementsManage), handlers.CancelScheduledBroadcast)
	admin.POST("/notifications/broadcast/:broadcastId/retry", middleware.PermissionRequired(models.PermAnnouncementsManage), handlers.RetryFailedNotifications)
	admin.POST("/notifications/push", middleware.PermissionRequired(models.PermAnnouncementsManage), handlers.SendPushNotification)
	admin.GET("/notifications/stats", middleware.PermissionRequired(models.PermAnalyticsView), handlers.GetNotificationStats)

	// Analytics Integration - User Journey Tracking
	admin.POST("/analytics/journey", middleware.PermissionRequired(models.PermAnalyticsView), handlers.TrackUserJourney)
	admin.POST("/analytics/conversion", middleware.PermissionRequired(models.PermAnalyticsView), handlers.TrackConversionEvent)
	admin.GET("/analytics/journeys", middleware.PermissionRequired(models.PermAnalyticsView), handlers.GetUserJourneys)
	admin.GET("/analytics/metrics", middleware.PermissionRequired(models.PermAnalyticsView), handlers.GetActivityMetrics)
	admin.POST("/analytics/journeys/export", middleware.PermissionRequired(models.PermAnalyticsView), handlers.ExportJourneys)

	// Scheduler System
	admin.GET("/scheduler", middleware.PermissionRequired(models.PermEventsManage), handlers.GetScheduledItems)
	admin.POST("/scheduler", middleware.PermissionRequired(models.PermEventsManage), handlers.CreateScheduledItem)
	admin.POST("/scheduler/:id/cancel", middleware.PermissionRequired(models.PermEventsManage), handlers.CancelScheduledItem)
	admin.POST("/scheduler/:id/retry", middleware.PermissionRequired(models.PermEventsManage), handlers.RetryScheduledItem)
	admin.POST("/scheduler/:id/execute", middleware.PermissionRequired(models.PermEventsManage), handlers.ExecuteScheduledItemNow)
	admin.DELETE("/scheduler/:id", middleware.PermissionRequired(models.PermEventsManage), handlers.DeleteScheduledItem)
	admin.GET("/scheduler/stats", middleware.PermissionRequired(models.PermEventsManage), handlers.GetSchedulerStats)

	// Custom Reports
	admin.GET("/reports", middleware.PermissionRequired(models.PermReportsView), handlers.GetCustomReports)
	admin.POST("/reports", middleware.PermissionRequired(models.PermReportsView), handlers.CreateCustomReport)
	admin.GET("/reports/:id", middleware.PermissionRequired(models.PermReportsView), handlers.GetCustomReport)
	admin.PATCH("/reports/:id", middleware.PermissionRequired(models.PermReportsView), handlers.UpdateCustomReport)
	admin.DELETE("/reports/:id", middleware.PermissionRequired(models.PermReportsView), handlers.DeleteCustomReport)
	admin.POST("/reports/:id/execute", middleware.PermissionRequired(models.PermReportsView), handlers.ExecuteCustomReport)
	admin.GET("/reports/:id/export", middleware.PermissionRequired(models.PermReportsView), handlers.ExportCustomReport)
	admin.POST("/reports/:id/schedule", middleware.PermissionRequired(models.PermReportsView), handlers.ScheduleCustomReport)

	// Support Tickets
	admin.GET("/tickets", middleware.PermissionRequired(models.PermUsersManage), handlers.GetSupportTickets)
	admin.POST("/tickets", middleware.PermissionRequired(models.PermUsersManage), handlers.CreateSupportTicket)
	admin.GET("/tickets/:id", middleware.PermissionRequired(models.PermUsersManage), handlers.GetSupportTicket)
	admin.POST("/tickets/:id/messages", middleware.PermissionRequired(models.PermUsersManage), handlers.SendTicketMessage)
	admin.PATCH("/tickets/:id/status", middleware.PermissionRequired(models.PermUsersManage), handlers.UpdateTicketStatus)
	admin.PATCH("/tickets/:id/priority", middleware.PermissionRequired(models.PermUsersManage), handlers.UpdateTicketPriority)
	admin.POST("/tickets/:id/assign", middleware.PermissionRequired(models.PermUsersManage), handlers.AssignTicket)
	admin.PATCH("/tickets/:id/tags", middleware.PermissionRequired(models.PermUsersManage), handlers.UpdateTicketTags)
	admin.POST("/tickets/:id/close", middleware.PermissionRequired(models.PermUsersManage), handlers.CloseTicket)
	admin.GET("/tickets/stats", middleware.PermissionRequired(models.PermUsersManage), handlers.GetTicketStats)

	// Backup Management
	admin.GET("/backups", middleware.PermissionRequired(models.PermSettingsView), handlers.GetBackups)
	admin.POST("/backups", middleware.PermissionRequired(models.PermSettingsView), handlers.CreateBackup)
	admin.DELETE("/backups/:id", middleware.PermissionRequired(models.PermSettingsView), handlers.DeleteBackup)
	admin.POST("/backups/:id/restore", middleware.PermissionRequired(models.PermSettingsView), handlers.RestoreBackup)
	admin.GET("/backups/:id/download", middleware.PermissionRequired(models.PermSettingsView), handlers.DownloadBackup)
	admin.POST("/backups/:id/verify", middleware.PermissionRequired(models.PermSettingsView), handlers.VerifyBackup)
	admin.GET("/backups/:id/progress", middleware.PermissionRequired(models.PermSettingsView), handlers.GetBackupProgress)
	admin.GET("/backups/stats", middleware.PermissionRequired(models.PermSettingsView), handlers.GetBackupStats)
	admin.GET("/backups/tables", middleware.PermissionRequired(models.PermSettingsView), handlers.GetDatabaseTables)
	admin.POST("/backups/schedule", middleware.PermissionRequired(models.PermSettingsView), handlers.ScheduleBackup)
	admin.PATCH("/backups/schedule/:id", middleware.PermissionRequired(models.PermSettingsView), handlers.UpdateBackupSchedule)
	admin.DELETE("/backups/schedule/:id", middleware.PermissionRequired(models.PermSettingsView), handlers.DeleteBackupSchedule)

	// Security - Two-Factor Authentication
	admin.GET("/security/2fa/status", middleware.PermissionRequired(models.PermSettingsView), handlers.GetTwoFactorStatus)
	admin.POST("/security/2fa/setup", middleware.PermissionRequired(models.PermSettingsView), handlers.InitiateTwoFactorSetup)
	admin.POST("/security/2fa/verify", middleware.PermissionRequired(models.PermSettingsView), handlers.VerifyTwoFactor)
	admin.POST("/security/2fa/disable", middleware.PermissionRequired(models.PermSettingsView), handlers.DisableTwoFactor)
	admin.POST("/security/2fa/backup-codes", middleware.PermissionRequired(models.PermSettingsView), handlers.RegenerateBackupCodes)
	admin.POST("/security/2fa/verify-login", middleware.PermissionRequired(models.PermSettingsView), handlers.VerifyTwoFactorLogin)
	admin.POST("/users/:id/2fa/enforce", middleware.PermissionRequired(models.PermUsersManage), handlers.AdminEnforceUserTwoFactor)
	admin.POST("/users/:id/2fa/reset", middleware.PermissionRequired(models.PermUsersManage), handlers.AdminResetUserTwoFactor)

	// Security - Session Management
	admin.GET("/security/sessions", middleware.PermissionRequired(models.PermSettingsView), handlers.GetActiveSessions)
	admin.POST("/security/sessions/:id/revoke", middleware.PermissionRequired(models.PermSettingsView), handlers.RevokeSession)
	admin.POST("/security/sessions/:id/suspend", middleware.PermissionRequired(models.PermSettingsView), handlers.SuspendSession)
	admin.POST("/security/sessions/revoke-others", middleware.PermissionRequired(models.PermSettingsView), handlers.RevokeOtherSessions)
	admin.POST("/security/sessions/user/:userId/revoke-all", middleware.PermissionRequired(models.PermUsersManage), handlers.RevokeUserSessions)
	admin.GET("/security/sessions/stats", middleware.PermissionRequired(models.PermSettingsView), handlers.GetSessionStats)
	admin.GET("/security/sessions/activity", middleware.PermissionRequired(models.PermSettingsView), handlers.GetSessionActivity)

	// Security - IP Whitelist
	admin.GET("/security/ip-whitelist", middleware.PermissionRequired(models.PermSettingsView), handlers.GetIPWhitelist)
	admin.POST("/security/ip-whitelist", middleware.PermissionRequired(models.PermSettingsView), handlers.AddIPToWhitelist)
	admin.DELETE("/security/ip-whitelist/:id", middleware.PermissionRequired(models.PermSettingsView), handlers.RemoveIPFromWhitelist)
	admin.PATCH("/security/ip-whitelist/:id", middleware.PermissionRequired(models.PermSettingsView), handlers.UpdateIPWhitelistEntry)
	admin.POST("/security/ip-whitelist/bulk", middleware.PermissionRequired(models.PermSettingsView), handlers.BulkAddIPToWhitelist)
	admin.GET("/security/ip-whitelist/settings", middleware.PermissionRequired(models.PermSettingsView), handlers.GetIPWhitelistSettings)
	admin.PATCH("/security/ip-whitelist/settings", middleware.PermissionRequired(models.PermSettingsView), handlers.UpdateIPWhitelistSettings)
	admin.GET("/security/ip-whitelist/check", middleware.PermissionRequired(models.PermSettingsView), handlers.CheckIPWhitelist)
	admin.GET("/security/ip-whitelist/blocked", middleware.PermissionRequired(models.PermSettingsView), handlers.GetBlockedAttempts)
}

// SetupAdminRoutes configures admin API endpoints (backward compatible)
func SetupAdminRoutes(router *gin.Engine) {
	// Create default middleware instances
	rateLimiter := middleware.NewAdvancedRateLimiter(nil, middleware.DefaultRateLimitConfig())
	auditLogger := middleware.NewAdminAuditLogger(middleware.DefaultAuditLoggerConfig())

	SetupAdminRoutesWithDependencies(router, rateLimiter, auditLogger)
}
