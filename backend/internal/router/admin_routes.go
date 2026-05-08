package router

import (
	"github.com/gin-gonic/gin"
	"thanawy-backend/internal/api/handlers"
	"thanawy-backend/internal/middleware"
	"thanawy-backend/internal/models"
)

const (
	pathAnnouncements = "/announcements"
	pathUsers         = "/users"
	pathUsersID       = pathUsers + "/:id"
	pathTeachers      = "/teachers"
	pathSubjects      = "/subjects"
	pathSubjectsID       = pathSubjects + "/:id"
	pathCourses          = "/courses"
	pathCoursesID        = pathCourses + "/:id"
	pathCourseCategories = "/course-categories"
	pathEvents        = "/events"
	pathExams            = "/exams"
	pathResources        = "/resources"
	pathReports          = "/reports"
	pathReportsID        = pathReports + "/:id"
	pathMarketing        = "/marketing"
	pathNotifications    = "/notifications"
	pathSecurity         = "/security"
	pathBooks            = "/books"
	pathBooksID          = pathBooks + "/:id"
	pathTickets          = "/tickets"
	pathTicketsID        = pathTickets + "/:id"
	pathCurriculum       = "/curriculum"
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
	admin.GET(pathReports+"/overview", middleware.PermissionRequired(models.PermReportsView), handlers.GetAdminReportsOverview)
	admin.GET(pathReports+"/books", middleware.PermissionRequired(models.PermReportsView), handlers.GetAdminReportsBooks)
	admin.GET(pathReports+"/users", middleware.PermissionRequired(models.PermReportsView), handlers.GetAdminReportsUsers)
	admin.GET(pathAnnouncements, middleware.PermissionRequired(models.PermAnnouncementsView), handlers.GetAdminAnnouncements)

	// User Management
	admin.GET(pathUsers, middleware.PermissionRequired(models.PermUsersView), handlers.GetUsers)
	admin.GET(pathUsersID, middleware.PermissionRequired(models.PermUsersView), handlers.GetUserByID)
	admin.POST(pathUsers, middleware.PermissionRequired(models.PermUsersManage), handlers.CreateUser)
	admin.PATCH(pathUsers, middleware.PermissionRequired(models.PermUsersManage), handlers.UpdateUser)
	admin.PATCH(pathUsersID, middleware.PermissionRequired(models.PermUsersManage), handlers.UpdateUser)
	admin.DELETE(pathUsers, middleware.PermissionRequired(models.PermUsersManage), handlers.DeleteUser)
	admin.DELETE(pathUsersID, middleware.PermissionRequired(models.PermUsersManage), handlers.DeleteUser)

	// Wallet Management
	admin.GET(pathUsersID+"/wallet/transactions", middleware.PermissionRequired(models.PermUsersView), handlers.GetUserWalletTransactions)
	admin.POST(pathUsers+"/wallet", middleware.PermissionRequired(models.PermUsersManage), handlers.ProcessWalletTransaction)

	admin.POST("/impersonate", middleware.PermissionRequired(models.PermAdminBypass), handlers.ImpersonateUser)
	admin.DELETE("/impersonate", middleware.PermissionRequired(models.PermAdminBypass), handlers.DeleteImpersonation)
	admin.POST(pathUsers+"/bulk-send-message", middleware.PermissionRequired(models.PermUsersManage), handlers.AdminBulkSendMessage)

	// Teacher Management
	admin.GET(pathTeachers, middleware.PermissionRequired(models.PermTeachersView), handlers.GetTeachers)
	admin.POST(pathTeachers, middleware.PermissionRequired(models.PermTeachersManage), handlers.CreateTeacher)
	admin.PATCH(pathTeachers, middleware.PermissionRequired(models.PermTeachersManage), handlers.UpdateTeacher)
	admin.DELETE(pathTeachers, middleware.PermissionRequired(models.PermTeachersManage), handlers.DeleteTeacher)

	// Subject Management
	admin.GET(pathSubjects, middleware.PermissionRequired(models.PermSubjectsView), handlers.GetSubjects)
	admin.GET(pathSubjectsID, middleware.PermissionRequired(models.PermSubjectsView), handlers.GetSubject)
	admin.POST(pathSubjects, middleware.PermissionRequired(models.PermSubjectsManage), handlers.CreateSubject)
	admin.PATCH(pathSubjects, middleware.PermissionRequired(models.PermSubjectsManage), handlers.UpdateSubject)
	admin.DELETE(pathSubjects, middleware.PermissionRequired(models.PermSubjectsManage), handlers.DeleteSubject)

	// Course Management
	admin.GET(pathCourses, middleware.PermissionRequired(models.PermSubjectsView), handlers.GetSubjects)
	admin.GET(pathCourses+"/export", middleware.PermissionRequired(models.PermSubjectsView), handlers.AdminCourseAction)
	admin.GET(pathCoursesID, middleware.PermissionRequired(models.PermSubjectsView), handlers.GetSubject)
	admin.DELETE(pathCourses, middleware.PermissionRequired(models.PermSubjectsManage), handlers.DeleteSubject)
	admin.GET(pathCourseCategories, middleware.PermissionRequired(models.PermSubjectsView), handlers.GetCategories)
	admin.POST(pathCourseCategories, middleware.PermissionRequired(models.PermSubjectsManage), handlers.CreateCategory)
	admin.PATCH(pathCourseCategories, middleware.PermissionRequired(models.PermSubjectsManage), handlers.UpdateCategory)
	admin.DELETE(pathCourseCategories, middleware.PermissionRequired(models.PermSubjectsManage), handlers.DeleteCategory)

	// Admin AI
	admin.GET("/ai", middleware.PermissionRequired(models.PermAiManage), handlers.AdminAIGet)
	admin.POST("/ai", middleware.PermissionRequired(models.PermAiManage), handlers.AdminAIPost)

	// Admin Events
	admin.GET(pathEvents, middleware.PermissionRequired(models.PermEventsView), handlers.AdminGetEvents)
	admin.POST(pathEvents, middleware.PermissionRequired(models.PermEventsManage), handlers.AdminCreateEvent)
	admin.PATCH(pathEvents, middleware.PermissionRequired(models.PermEventsManage), handlers.AdminUpdateEvent)
	admin.DELETE(pathEvents, middleware.PermissionRequired(models.PermEventsManage), handlers.AdminDeleteEvent)
	admin.POST(pathAnnouncements, middleware.PermissionRequired(models.PermAnnouncementsManage), handlers.CreateAdminAnnouncement)
	admin.PATCH(pathAnnouncements, middleware.PermissionRequired(models.PermAnnouncementsManage), handlers.UpdateAdminAnnouncement)
	admin.DELETE(pathAnnouncements, middleware.PermissionRequired(models.PermAnnouncementsManage), handlers.DeleteAdminAnnouncement)

	// Admin Course Management
	admin.POST(pathCourses, middleware.PermissionRequired(models.PermSubjectsManage), handlers.CreateSubject)
	admin.PATCH(pathCourses, middleware.PermissionRequired(models.PermSubjectsManage), handlers.UpdateSubject)
	admin.DELETE(pathCoursesID, middleware.PermissionRequired(models.PermSubjectsManage), handlers.DeleteSubject)
	admin.POST(pathCourses+"/duplicate", middleware.PermissionRequired(models.PermSubjectsManage), handlers.AdminCourseAction)
	admin.POST(pathCourses+"/batch", middleware.PermissionRequired(models.PermSubjectsManage), handlers.AdminCourseAction)
	admin.GET(pathCoursesID+pathCurriculum, middleware.PermissionRequired(models.PermSubjectsView), handlers.GetSubjectCurriculum)
	admin.PATCH(pathCoursesID+pathCurriculum, middleware.PermissionRequired(models.PermSubjectsManage), handlers.UpdateCourseCurriculum)
	admin.PUT(pathCoursesID+pathCurriculum, middleware.PermissionRequired(models.PermSubjectsManage), handlers.UpdateCourseCurriculum)
	admin.POST(pathCourses+"/lessons/:id/attachments", middleware.PermissionRequired(models.PermSubjectsManage), handlers.AddLessonAttachment)
	admin.GET(pathCoursesID+"/enrollments", middleware.PermissionRequired(models.PermSubjectsView), handlers.GetCourseEnrollments)
	admin.POST(pathCoursesID+"/enrollments", middleware.PermissionRequired(models.PermSubjectsManage), handlers.ManualEnroll)
	admin.DELETE(pathCoursesID+"/enrollments/:userId", middleware.PermissionRequired(models.PermSubjectsManage), handlers.UnenrollUser)

	// Admin Exams
	admin.GET(pathExams, middleware.PermissionRequired(models.PermExamsView), handlers.GetExams)
	admin.POST(pathExams, middleware.PermissionRequired(models.PermExamsManage), handlers.CreateExam)
	admin.PATCH(pathExams, middleware.PermissionRequired(models.PermExamsManage), handlers.UpdateExam)
	admin.DELETE(pathExams, middleware.PermissionRequired(models.PermExamsManage), handlers.DeleteExam)
	admin.POST(pathExams+"/bulk", middleware.PermissionRequired(models.PermExamsManage), handlers.AdminExamsBulkUpload)

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
	admin.GET(pathMarketing, middleware.PermissionRequired(models.PermMarketingView), handlers.AdminGetCampaigns)
	admin.POST(pathMarketing, middleware.PermissionRequired(models.PermMarketingManage), handlers.AdminCreateCampaign)
	admin.GET(pathMarketing+"/campaigns", middleware.PermissionRequired(models.PermMarketingView), handlers.AdminGetCampaigns)
	admin.POST(pathMarketing+"/campaigns", middleware.PermissionRequired(models.PermMarketingManage), handlers.AdminCreateCampaign)
	admin.PATCH(pathMarketing+"/campaigns/:id", middleware.PermissionRequired(models.PermMarketingManage), handlers.AdminUpdateCampaign)
	admin.DELETE(pathMarketing+"/campaigns/:id", middleware.PermissionRequired(models.PermMarketingManage), handlers.AdminDeleteCampaign)

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

	admin.GET(pathBooks, middleware.PermissionRequired(models.PermBooksView), handlers.AdminGetBooks)
	admin.POST(pathBooks, middleware.PermissionRequired(models.PermBooksManage), handlers.AdminCreateBook)
	admin.PATCH(pathBooksID, middleware.PermissionRequired(models.PermBooksManage), handlers.AdminUpdateBook)
	admin.DELETE(pathBooksID, middleware.PermissionRequired(models.PermBooksManage), handlers.AdminDeleteBook)

	// Admin Logs & Reporting
	admin.GET("/audit-logs", middleware.PermissionRequired(models.PermAuditLogsView), handlers.AdminGetAuditLogs)
	admin.GET(pathReports+"/content", middleware.PermissionRequired(models.PermReportsView), handlers.AdminReportsContent)
	admin.PATCH(pathReports+"/content", middleware.PermissionRequired(models.PermReportsView), handlers.AdminReportsContent)
	admin.GET(pathBooks+"/reviews", middleware.PermissionRequired(models.PermBooksView), handlers.AdminBookReviews)
	admin.DELETE(pathBooks+"/reviews", middleware.PermissionRequired(models.PermBooksManage), handlers.AdminBookReviews)
	admin.GET(pathBooks+"/views", middleware.PermissionRequired(models.PermBooksView), handlers.AdminBookReviews)
	admin.GET("/settings", middleware.PermissionRequired(models.PermSettingsView), handlers.AdminSettings)
	admin.PATCH("/settings", middleware.PermissionRequired(models.PermSettingsView), handlers.AdminSettings)
	admin.GET(pathResources, middleware.PermissionRequired(models.PermResourcesView), handlers.AdminGetResources)
	admin.POST(pathResources, middleware.PermissionRequired(models.PermResourcesManage), handlers.AdminCreateResource)
	admin.PATCH(pathResources, middleware.PermissionRequired(models.PermResourcesManage), handlers.AdminUpdateResource)
	admin.DELETE(pathResources, middleware.PermissionRequired(models.PermResourcesManage), handlers.AdminDeleteResource)

	// Advanced Search Endpoints with Cursor Pagination
	admin.GET("/search"+pathUsers, middleware.PermissionRequired(models.PermUsersView), handlers.SearchUsers)
	admin.GET("/search/content", middleware.PermissionRequired(models.PermSubjectsView), handlers.SearchContent)

	// Unified Notification System
	admin.GET(pathNotifications, middleware.PermissionRequired(models.PermAnnouncementsManage), handlers.AdminListNotifications)
	admin.POST(pathNotifications+"/:id/read", middleware.PermissionRequired(models.PermAnnouncementsManage), handlers.AdminMarkNotificationRead)
	admin.POST(pathNotifications+"/read-all", middleware.PermissionRequired(models.PermAnnouncementsManage), handlers.AdminMarkAllNotificationsRead)
	admin.DELETE(pathNotifications+"/:id", middleware.PermissionRequired(models.PermAnnouncementsManage), handlers.AdminDeleteNotification)
	admin.GET("/broadcasts", middleware.PermissionRequired(models.PermAnnouncementsManage), handlers.GetBroadcasts)
	admin.POST(pathNotifications+"/broadcast", middleware.PermissionRequired(models.PermAnnouncementsManage), handlers.SendNotificationBroadcast)
	admin.POST(pathNotifications+"/schedule", middleware.PermissionRequired(models.PermAnnouncementsManage), handlers.ScheduleNotificationBroadcast)
	admin.POST(pathNotifications+"/broadcast/:broadcastId/cancel", middleware.PermissionRequired(models.PermAnnouncementsManage), handlers.CancelScheduledBroadcast)
	admin.POST(pathNotifications+"/broadcast/:broadcastId/retry", middleware.PermissionRequired(models.PermAnnouncementsManage), handlers.RetryFailedNotifications)
	admin.POST(pathNotifications+"/push", middleware.PermissionRequired(models.PermAnnouncementsManage), handlers.SendPushNotification)
	admin.GET(pathNotifications+"/stats", middleware.PermissionRequired(models.PermAnalyticsView), handlers.GetNotificationStats)

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
	admin.GET(pathReports, middleware.PermissionRequired(models.PermReportsView), handlers.GetCustomReports)
	admin.POST(pathReports, middleware.PermissionRequired(models.PermReportsView), handlers.CreateCustomReport)
	admin.GET(pathReportsID, middleware.PermissionRequired(models.PermReportsView), handlers.GetCustomReport)
	admin.PATCH(pathReportsID, middleware.PermissionRequired(models.PermReportsView), handlers.UpdateCustomReport)
	admin.DELETE(pathReportsID, middleware.PermissionRequired(models.PermReportsView), handlers.DeleteCustomReport)
	admin.POST(pathReportsID+"/execute", middleware.PermissionRequired(models.PermReportsView), handlers.ExecuteCustomReport)
	admin.GET(pathReportsID+"/export", middleware.PermissionRequired(models.PermReportsView), handlers.ExportCustomReport)
	admin.POST(pathReportsID+"/schedule", middleware.PermissionRequired(models.PermReportsView), handlers.ScheduleCustomReport)

	// Support Tickets
	admin.GET(pathTickets, middleware.PermissionRequired(models.PermUsersManage), handlers.GetSupportTickets)
	admin.POST(pathTickets, middleware.PermissionRequired(models.PermUsersManage), handlers.CreateSupportTicket)
	admin.GET(pathTicketsID, middleware.PermissionRequired(models.PermUsersManage), handlers.GetSupportTicket)
	admin.POST(pathTicketsID+"/messages", middleware.PermissionRequired(models.PermUsersManage), handlers.SendTicketMessage)
	admin.PATCH(pathTicketsID+"/status", middleware.PermissionRequired(models.PermUsersManage), handlers.UpdateTicketStatus)
	admin.PATCH(pathTicketsID+"/priority", middleware.PermissionRequired(models.PermUsersManage), handlers.UpdateTicketPriority)
	admin.POST(pathTicketsID+"/assign", middleware.PermissionRequired(models.PermUsersManage), handlers.AssignTicket)
	admin.PATCH(pathTicketsID+"/tags", middleware.PermissionRequired(models.PermUsersManage), handlers.UpdateTicketTags)
	admin.POST(pathTicketsID+"/close", middleware.PermissionRequired(models.PermUsersManage), handlers.CloseTicket)
	admin.GET(pathTickets+"/stats", middleware.PermissionRequired(models.PermUsersManage), handlers.GetTicketStats)

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
	admin.GET(pathSecurity+"/2fa/status", middleware.PermissionRequired(models.PermSettingsView), handlers.GetTwoFactorStatus)
	admin.POST(pathSecurity+"/2fa/setup", middleware.PermissionRequired(models.PermSettingsView), handlers.InitiateTwoFactorSetup)
	admin.POST(pathSecurity+"/2fa/verify", middleware.PermissionRequired(models.PermSettingsView), handlers.VerifyTwoFactor)
	admin.POST(pathSecurity+"/2fa/disable", middleware.PermissionRequired(models.PermSettingsView), handlers.DisableTwoFactor)
	admin.POST(pathSecurity+"/2fa/backup-codes", middleware.PermissionRequired(models.PermSettingsView), handlers.RegenerateBackupCodes)
	admin.POST(pathSecurity+"/2fa/verify-login", middleware.PermissionRequired(models.PermSettingsView), handlers.VerifyTwoFactorLogin)
	admin.POST(pathUsersID+"/2fa/enforce", middleware.PermissionRequired(models.PermUsersManage), handlers.AdminEnforceUserTwoFactor)
	admin.POST(pathUsersID+"/2fa/reset", middleware.PermissionRequired(models.PermUsersManage), handlers.AdminResetUserTwoFactor)

	// Security - Session Management
	admin.GET(pathSecurity+"/sessions", middleware.PermissionRequired(models.PermSettingsView), handlers.GetActiveSessions)
	admin.POST(pathSecurity+"/sessions/:id/revoke", middleware.PermissionRequired(models.PermSettingsView), handlers.RevokeSession)
	admin.POST(pathSecurity+"/sessions/:id/suspend", middleware.PermissionRequired(models.PermSettingsView), handlers.SuspendSession)
	admin.POST(pathSecurity+"/sessions/revoke-others", middleware.PermissionRequired(models.PermSettingsView), handlers.RevokeOtherSessions)
	admin.POST(pathSecurity+"/sessions/user/:userId/revoke-all", middleware.PermissionRequired(models.PermUsersManage), handlers.RevokeUserSessions)
	admin.GET(pathSecurity+"/sessions/stats", middleware.PermissionRequired(models.PermSettingsView), handlers.GetSessionStats)
	admin.GET(pathSecurity+"/sessions/activity", middleware.PermissionRequired(models.PermSettingsView), handlers.GetSessionActivity)

	// Security - IP Whitelist
	admin.GET(pathSecurity+"/ip-whitelist", middleware.PermissionRequired(models.PermSettingsView), handlers.GetIPWhitelist)
	admin.POST(pathSecurity+"/ip-whitelist", middleware.PermissionRequired(models.PermSettingsView), handlers.AddIPToWhitelist)
	admin.DELETE(pathSecurity+"/ip-whitelist/:id", middleware.PermissionRequired(models.PermSettingsView), handlers.RemoveIPFromWhitelist)
	admin.PATCH(pathSecurity+"/ip-whitelist/:id", middleware.PermissionRequired(models.PermSettingsView), handlers.UpdateIPWhitelistEntry)
	admin.POST(pathSecurity+"/ip-whitelist/bulk", middleware.PermissionRequired(models.PermSettingsView), handlers.BulkAddIPToWhitelist)
	admin.GET(pathSecurity+"/ip-whitelist/settings", middleware.PermissionRequired(models.PermSettingsView), handlers.GetIPWhitelistSettings)
	admin.PATCH(pathSecurity+"/ip-whitelist/settings", middleware.PermissionRequired(models.PermSettingsView), handlers.UpdateIPWhitelistSettings)
	admin.GET(pathSecurity+"/ip-whitelist/check", middleware.PermissionRequired(models.PermSettingsView), handlers.CheckIPWhitelist)
	admin.GET(pathSecurity+"/ip-whitelist/blocked", middleware.PermissionRequired(models.PermSettingsView), handlers.GetBlockedAttempts)
}

// SetupAdminRoutes configures admin API endpoints (backward compatible)
func SetupAdminRoutes(router *gin.Engine) {
	// Create default middleware instances
	rateLimiter := middleware.NewAdvancedRateLimiter(nil, middleware.DefaultRateLimitConfig())
	auditLogger := middleware.NewAdminAuditLogger(middleware.DefaultAuditLoggerConfig())

	SetupAdminRoutesWithDependencies(router, rateLimiter, auditLogger)
}
