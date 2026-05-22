package router

import (
	"thanawy-backend/internal/api/handlers"
	"thanawy-backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

const (
	pathTasks         = "/tasks"
	pathTasksID       = pathTasks + "/:id"
	pathUpload        = "/upload"
	pathUploadChunked = pathUpload + "/chunked"
)

// SetupProtectedRoutes configures protected API endpoints
func SetupProtectedRoutes(router *gin.Engine) {
	protected := router.Group("/api")
	protected.Use(middleware.Auth())
	protected.Use(middleware.Idempotency())
	{
		protected.GET("/progress/summary", handlers.GetProgressSummary)
		protected.GET("/analytics/weekly", handlers.GetWeeklyAnalytics)
		protected.GET("/analytics/time", handlers.GetTimeAnalytics)
		protected.GET("/analytics/performance", handlers.GetWeeklyAnalytics)
		protected.GET("/analytics/predictions", handlers.GetWeeklyAnalytics)
		protected.GET("/recommendations", handlers.GetAIRecommendations)

		// Protected Activity routes
		protected.GET("/schedule", handlers.GetSchedule)
		protected.GET(pathTasks, handlers.GetTasks)
		protected.GET("/study-sessions", handlers.GetStudySessions)
		protected.GET("/reminders", handlers.GetReminders)
		protected.GET("/resources", handlers.GetResources)
		protected.POST("/schedule", handlers.UpdateSchedule)
		protected.POST(pathTasks, handlers.CreateTask)
		protected.PATCH(pathTasksID, handlers.UpdateTask)
		protected.PUT(pathTasksID, handlers.UpdateTask)
		protected.DELETE(pathTasksID, handlers.DeleteTask)
		protected.POST("/study-sessions", handlers.CreateStudySession)
		protected.POST("/reminders", handlers.CreateReminder)

		// Notifications
		protected.GET("/notifications", handlers.GetNotifications)
		protected.GET("/notifications/unread-count", handlers.GetUnreadNotificationsCount)
		protected.POST("/notifications/mark-read", handlers.MarkNotificationRead)
		protected.POST("/notifications/enqueue", handlers.CreateNotificationTask)

		// Settings
		protected.GET("/settings/preferences", handlers.GetSettings)
		protected.PATCH("/settings/preferences", handlers.UpdateSettings)

		// Profile
		protected.GET("/users/billing-summary", handlers.GetBillingSummary)
		protected.GET("/users/profile", handlers.GetUserProfile)
		protected.PATCH("/users/profile", handlers.UpdateProfile)
		protected.GET("/users/progress/courses", handlers.GetUserCoursesProgress)
		protected.GET("/users/progress/time", handlers.GetUserTimeProgress)
		protected.GET("/users/progress/achievements", handlers.GetUserAchievementsProgress)

		// Activities
		protected.GET("/activities/recent", handlers.GetRecentActivities)
		protected.POST("/activities/:id/read", handlers.MarkActivityRead)
		protected.POST("/activities/read-all", handlers.MarkAllActivitiesRead)

		// Billing & Subscriptions
		protected.GET("/billing/wallet", handlers.GetWalletBalance)
		protected.POST("/billing/wallet", middleware.AdminRequired(), handlers.HandleWalletDeposit)
		protected.GET("/billing/wallet/transactions", handlers.GetUserWalletTransactions)
		protected.GET("/subscriptions/plans", handlers.GetSubscriptionPlans)
		protected.GET("/subscriptions", handlers.GetUserSubscription)
		protected.GET("/subscriptions/addons", handlers.GetSubscriptionAddons)
		protected.POST("/subscriptions/addons", handlers.PurchaseAddon)
		protected.POST("/subscriptions/purchase", handlers.PurchasePlan)
		protected.POST("/subscriptions/initiate-payment", handlers.InitiatePlanPayment)
		protected.POST("/subscriptions/cancel", handlers.CancelSubscription)
		protected.POST("/subscriptions/renew", handlers.RenewSubscription)
		protected.POST("/coupons/validate", handlers.ValidateCoupon)

		// User Subjects & Courses
		protected.GET("/subjects", handlers.GetUserSubjects)
		protected.GET("/my-courses", handlers.GetMyCourses)

		// Search
		protected.GET("/search", handlers.GlobalSearch)
		protected.GET("/database-partitions", handlers.DatabasePartitions)
		protected.GET("/marketing", handlers.Marketing)
		protected.POST("/marketing", handlers.Marketing)
		protected.GET("/contests", handlers.Contests)
		protected.POST("/contests", handlers.Contests)
		protected.PATCH("/contests/:id", handlers.Contests)
		protected.DELETE("/contests/:id", handlers.Contests)

		// Library
		protected.GET("/library/books", handlers.GetLibraryBooks)
		protected.POST("/library/books", handlers.CreateLibraryBook)

		// Enrollment & Progress
		protected.POST("/courses/:id/enroll", handlers.EnrollCourse)
		protected.POST("/courses/:id/checkout", handlers.CourseCheckout)
		protected.GET("/courses/:id/curriculum", handlers.GetSubjectCurriculum)
		protected.POST("/courses/lessons/:id/progress", handlers.UpdateLessonProgress)

		// Lesson Notes & Reviews
		protected.GET("/courses/lessons/:id/notes", handlers.GetLessonNotes)
		protected.POST("/courses/lessons/:id/notes", handlers.CreateLessonNote)
		protected.POST("/courses/:id/reviews", handlers.CreateCourseReview)

		// Upload
		protected.POST("/upload/presign", handlers.PresignUpload)
		protected.POST(pathUpload, handlers.Upload)
		protected.POST(pathUploadChunked, handlers.UploadChunked)
		protected.PUT(pathUploadChunked, handlers.UploadChunked)
		protected.PATCH(pathUploadChunked, handlers.UploadChunked)

		// Exam routes
		protected.POST("/exams/:id/submit", handlers.SubmitExam)

		// Gamification routes
		protected.GET("/gamification/progress", handlers.GetUserProgress)
		protected.GET("/gamification/leaderboard", handlers.GetLeaderboard)
		protected.GET("/gamification/achievements", handlers.GetUserAchievements)
		protected.POST("/gamification/goals", handlers.CreateCustomGoal)
		protected.PATCH("/gamification/goals/:id", handlers.UpdateCustomGoal)

		// Event Ingestion (lightweight, fire-and-forget to Redis Stream)
		protected.POST("/events/ingest", handlers.IngestEvent)

		// Payment routes
		protected.POST("/payments/create", handlers.CreatePayment)
		protected.GET("/payments/history", handlers.GetPaymentHistory)
	}
}
