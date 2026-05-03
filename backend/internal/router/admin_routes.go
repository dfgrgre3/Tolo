package router

import (
	"github.com/gin-gonic/gin"
	"thanawy-backend/internal/api/handlers"
	"thanawy-backend/internal/models"
	"thanawy-backend/internal/middleware"
)

// SetupAdminRoutes configures admin API endpoints
func SetupAdminRoutes(router *gin.Engine) {
	admin := router.Group("/api/admin")
	admin.Use(middleware.Auth())
	admin.Use(middleware.AdminRequired())
	admin.Use(middleware.AdminRateLimiter())
	{
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
		admin.GET("/teachers", middleware.PermissionRequired(models.PermUsersView), handlers.GetTeachers)
		admin.POST("/teachers", middleware.PermissionRequired(models.PermUsersManage), handlers.CreateTeacher)
		admin.PATCH("/teachers", middleware.PermissionRequired(models.PermUsersManage), handlers.UpdateTeacher)
		admin.DELETE("/teachers", middleware.PermissionRequired(models.PermUsersManage), handlers.DeleteTeacher)
		
		// Subject Management
		admin.GET("/subjects", middleware.PermissionRequired(models.PermSubjectsView), handlers.GetSubjects)
		admin.GET("/subjects/:id", middleware.PermissionRequired(models.PermSubjectsView), handlers.GetSubject)
		admin.POST("/subjects", middleware.PermissionRequired(models.PermSubjectsManage), handlers.CreateSubject)
		admin.PATCH("/subjects", middleware.PermissionRequired(models.PermSubjectsManage), handlers.UpdateSubject)
		admin.DELETE("/subjects", middleware.PermissionRequired(models.PermSubjectsManage), handlers.DeleteSubject)
		
		// Course Management
		admin.GET("/courses", middleware.PermissionRequired(models.PermSubjectsView), handlers.GetSubjects)
		admin.GET("/courses/export", handlers.AdminCourseAction)
		admin.GET("/courses/:id", handlers.GetSubject)
		admin.DELETE("/courses", handlers.DeleteSubject)
		admin.GET("/course-categories", handlers.GetCategories)
		admin.POST("/course-categories", handlers.CreateCategory)
		admin.PATCH("/course-categories", handlers.UpdateCategory)
		admin.DELETE("/course-categories", handlers.DeleteCategory)
		
		// Admin AI
		admin.GET("/ai", handlers.AdminAIGet)
		admin.POST("/ai", handlers.AdminAIPost)
		
		// Admin Events
		admin.GET("/events", middleware.PermissionRequired(models.PermEventsView), handlers.AdminGetEvents)
		admin.POST("/events", middleware.PermissionRequired(models.PermEventsManage), handlers.AdminCreateEvent)
		admin.PATCH("/events", middleware.PermissionRequired(models.PermEventsManage), handlers.AdminUpdateEvent)
		admin.DELETE("/events", middleware.PermissionRequired(models.PermEventsManage), handlers.AdminDeleteEvent)
		admin.POST("/announcements", middleware.PermissionRequired(models.PermAnnouncementsManage), handlers.CreateAdminAnnouncement)
		admin.PATCH("/announcements", middleware.PermissionRequired(models.PermAnnouncementsManage), handlers.UpdateAdminAnnouncement)
		admin.DELETE("/announcements", middleware.PermissionRequired(models.PermAnnouncementsManage), handlers.DeleteAdminAnnouncement)
		
		// Admin Course Management
		admin.POST("/courses", handlers.CreateSubject)
		admin.PATCH("/courses", handlers.UpdateSubject)
		admin.DELETE("/courses/:id", handlers.DeleteSubject)
		admin.POST("/courses/duplicate", handlers.AdminCourseAction)
		admin.POST("/courses/batch", handlers.AdminCourseAction)
		admin.GET("/courses/:id/curriculum", handlers.GetSubjectCurriculum)
		admin.PATCH("/courses/:id/curriculum", handlers.UpdateCourseCurriculum)
		admin.PUT("/courses/:id/curriculum", handlers.UpdateCourseCurriculum)
		admin.POST("/courses/lessons/:id/attachments", handlers.AddLessonAttachment)
		admin.GET("/courses/:id/enrollments", handlers.GetCourseEnrollments)
		admin.POST("/courses/:id/enrollments", handlers.ManualEnroll)
		admin.DELETE("/courses/:id/enrollments/:userId", handlers.UnenrollUser)
		
		// Admin Exams
		admin.GET("/exams", middleware.PermissionRequired(models.PermExamsView), handlers.GetExams)
		admin.POST("/exams", middleware.PermissionRequired(models.PermExamsManage), handlers.CreateExam)
		admin.PATCH("/exams", middleware.PermissionRequired(models.PermExamsManage), handlers.UpdateExam)
		admin.DELETE("/exams", middleware.PermissionRequired(models.PermExamsManage), handlers.DeleteExam)
		admin.POST("/exams/bulk", middleware.PermissionRequired(models.PermExamsManage), handlers.AdminExamsBulkUpload)
		
		// Admin Payments & Revenue
		admin.GET("/payments", handlers.GetAdminPayments)
		admin.GET("/analytics/revenue", handlers.GetAdminRevenue)
		
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
		admin.Any("/reports/content", handlers.AdminReportsContent)
		admin.Any("/books/reviews", handlers.AdminBookReviews)
		admin.Any("/books/views", handlers.AdminBookReviews)
		admin.GET("/settings", middleware.PermissionRequired(models.PermSettingsView), handlers.AdminSettings)
		admin.PATCH("/settings", middleware.PermissionRequired(models.PermSettingsView), handlers.AdminSettings)
		admin.Any("/resources", middleware.PermissionRequired(models.PermResourcesManage), handlers.AdminCollection("resources"))
	}
}