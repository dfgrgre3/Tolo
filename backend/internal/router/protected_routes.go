package router

import (
	"github.com/gin-gonic/gin"
	"thanawy-backend/internal/api/handlers"
	"thanawy-backend/internal/middleware"
)

// SetupProtectedRoutes configures protected API endpoints
func SetupProtectedRoutes(router *gin.Engine) {
	protected := router.Group("/api")
	protected.Use(middleware.Auth())
	{
		protected.GET("/progress/summary", handlers.GetProgressSummary)
		protected.GET("/analytics/weekly", handlers.GetWeeklyAnalytics)
		protected.GET("/analytics/time", handlers.GetTimeAnalytics)
		protected.GET("/analytics/performance", handlers.GetWeeklyAnalytics)
		protected.GET("/analytics/predictions", handlers.GetWeeklyAnalytics)
		protected.GET("/recommendations", handlers.GetAIRecommendations)

		// Protected Activity routes
		protected.GET("/schedule", handlers.GetSchedule)
		protected.GET("/tasks", handlers.GetTasks)
		protected.GET("/study-sessions", handlers.GetStudySessions)
		protected.GET("/reminders", handlers.GetReminders)
		protected.GET("/resources", func(c *gin.Context) {
			c.JSON(200, gin.H{"data": []interface{}{}, "success": true})
		})
		protected.POST("/schedule", handlers.UpdateSchedule)
		protected.POST("/tasks", handlers.CreateTask)
		protected.PATCH("/tasks/:id", handlers.UpdateTask)
		protected.PUT("/tasks/:id", handlers.UpdateTask)
		protected.DELETE("/tasks/:id", handlers.DeleteTask)
		protected.POST("/study-sessions", handlers.CreateStudySession)
		protected.POST("/reminders", handlers.CreateReminder)

		// Notifications
		protected.GET("/notifications", handlers.GetNotifications)
		protected.GET("/notifications/unread-count", handlers.GetUnreadNotificationsCount)
		protected.POST("/notifications/mark-read", handlers.MarkNotificationRead)

		// Settings
		protected.GET("/settings/preferences", handlers.GetSettings)
		protected.PATCH("/settings/preferences", handlers.UpdateSettings)

		// Profile
		protected.GET("/users/billing-summary", handlers.GetBillingSummary)
		protected.PATCH("/users/profile", handlers.UpdateProfile)

		// Activities
		protected.GET("/activities/recent", handlers.GetRecentActivities)
		protected.POST("/activities/:id/read", handlers.MarkActivityRead)
		protected.POST("/activities/read-all", handlers.MarkAllActivitiesRead)

		// Billing & Subscriptions
		protected.GET("/billing/wallet", handlers.GetWalletBalance)
		protected.POST("/billing/wallet", handlers.HandleWalletDeposit)
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

		// User Subjects
		protected.GET("/subjects", handlers.GetUserSubjects)

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
		protected.POST("/upload", handlers.Upload)
		protected.Any("/upload/chunked", handlers.UploadChunked)

		// Exam routes
		protected.POST("/exams/:id/submit", handlers.SubmitExam)

		// Payment routes
		protected.POST("/payments/create", handlers.CreatePayment)
		protected.GET("/payments/history", handlers.GetPaymentHistory)
	}
}
